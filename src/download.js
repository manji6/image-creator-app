const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;
const MAX_PROMPT_SEGMENT = 64;
const MAX_METADATA_PROMPT = 4000;
const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

function toHex(uint8) {
  return Array.from(uint8)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function uint32Bytes(value) {
  return new Uint8Array([(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]);
}

function concatUint8Arrays(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

function createCrc32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c >>>= 1;
      }
    }
    table[i] = c >>> 0;
  }
  return table;
}

const CRC32_TABLE = createCrc32Table();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const value of bytes) {
    crc = CRC32_TABLE[(crc ^ value) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function isPngBytes(bytes) {
  if (bytes.length < PNG_SIGNATURE.length) {
    return false;
  }
  for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
    if (bytes[i] !== PNG_SIGNATURE[i]) {
      return false;
    }
  }
  return true;
}

function inferExtensionFromMime(mimeType) {
  const mime = (mimeType || '').toLowerCase();
  if (mime.includes('png')) {
    return 'png';
  }
  if (mime.includes('jpeg') || mime.includes('jpg')) {
    return 'jpg';
  }
  if (mime.includes('webp')) {
    return 'webp';
  }
  if (mime.includes('gif')) {
    return 'gif';
  }
  return '';
}

function inferExtensionFromUrl(url) {
  if (!url || url.startsWith('data:')) {
    return '';
  }
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\.([a-zA-Z0-9]{2,5})$/);
    if (match?.[1]) {
      return match[1].toLowerCase();
    }
  } catch {
    return '';
  }
  return '';
}

export function sanitizePromptSegment(prompt) {
  const normalized = String(prompt || '')
    .replace(/\s+/g, '_')
    .replace(INVALID_FILENAME_CHARS, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!normalized) {
    return 'prompt';
  }
  return normalized.slice(0, MAX_PROMPT_SEGMENT);
}

async function fallbackHash(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export async function shortPromptHash(prompt) {
  const source = String(prompt || '');
  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(source);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    return toHex(new Uint8Array(digest)).slice(0, 12);
  }
  return fallbackHash(source);
}

export function chooseFileExtension(blob, imageUrl) {
  const fromMime = inferExtensionFromMime(blob?.type || '');
  if (fromMime) {
    return fromMime;
  }

  const fromUrl = inferExtensionFromUrl(imageUrl);
  if (fromUrl) {
    return fromUrl;
  }

  return 'png';
}

export function getCardPromptForExport(card) {
  if (card?.finalPrompt && String(card.finalPrompt).trim()) {
    return String(card.finalPrompt).trim();
  }
  return String(card?.prompt || '').trim();
}

export async function fetchImageBlob(imageUrl) {
  if (!imageUrl) {
    throw new Error('imageUrl is empty');
  }
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Image download failed: HTTP ${response.status}`);
  }
  return response.blob();
}

function createItxtChunk(keyword, text) {
  const keywordBytes = new TextEncoder().encode(keyword);
  const textBytes = new TextEncoder().encode(text.slice(0, MAX_METADATA_PROMPT));

  // iTXt format:
  // keyword\0 compression_flag(0) compression_method(0) language_tag\0 translated_keyword\0 text
  const data = concatUint8Arrays([
    keywordBytes,
    new Uint8Array([0, 0, 0, 0, 0]),
    textBytes
  ]);

  const chunkType = new TextEncoder().encode('iTXt');
  const chunkPayload = concatUint8Arrays([chunkType, data]);
  const crc = uint32Bytes(crc32(chunkPayload));

  return concatUint8Arrays([uint32Bytes(data.length), chunkType, data, crc]);
}

export async function embedPromptMetadataInPng(blob, prompt) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (!isPngBytes(bytes)) {
    return { blob, metadataEmbedded: false };
  }

  const promptText = String(prompt || '').trim();
  if (!promptText) {
    return { blob, metadataEmbedded: false };
  }

  const outputChunks = [bytes.subarray(0, 8)];
  const metadataChunk = createItxtChunk('Prompt', promptText);
  let offset = 8;
  let inserted = false;

  while (offset + 12 <= bytes.length) {
    const length =
      (bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3];
    const chunkStart = offset;
    const chunkTypeStart = offset + 4;
    const chunkDataStart = chunkTypeStart + 4;
    const chunkEnd = chunkDataStart + length + 4;

    if (chunkEnd > bytes.length) {
      return { blob, metadataEmbedded: false };
    }

    const chunkType = String.fromCharCode(
      bytes[chunkTypeStart],
      bytes[chunkTypeStart + 1],
      bytes[chunkTypeStart + 2],
      bytes[chunkTypeStart + 3]
    );

    if (!inserted && chunkType === 'IEND') {
      outputChunks.push(metadataChunk);
      inserted = true;
    }

    outputChunks.push(bytes.subarray(chunkStart, chunkEnd));
    offset = chunkEnd;
  }

  if (!inserted) {
    return { blob, metadataEmbedded: false };
  }

  const merged = concatUint8Arrays(outputChunks);
  return {
    blob: new Blob([merged], { type: 'image/png' }),
    metadataEmbedded: true
  };
}

export async function createDownloadAsset(card) {
  if (!card?.imageUrl) {
    throw new Error('No image available for download');
  }

  const promptText = getCardPromptForExport(card);
  const hash = await shortPromptHash(promptText || card.imageUrl);
  const promptSegment = sanitizePromptSegment(card.prompt || promptText || 'prompt');

  const sourceBlob = await fetchImageBlob(card.imageUrl);
  const extension = chooseFileExtension(sourceBlob, card.imageUrl);

  let finalBlob = sourceBlob;
  let metadataEmbedded = false;

  if (extension === 'png') {
    try {
      const result = await embedPromptMetadataInPng(sourceBlob, promptText || card.prompt);
      finalBlob = result.blob;
      metadataEmbedded = result.metadataEmbedded;
    } catch {
      metadataEmbedded = false;
      finalBlob = sourceBlob;
    }
  }

  const fileName = `${hash}_${promptSegment}.${extension}`;
  return {
    blob: finalBlob,
    fileName,
    metadataEmbedded
  };
}

export function triggerBlobDownload(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1200);
}

export async function downloadSingleCard(card) {
  const asset = await createDownloadAsset(card);
  triggerBlobDownload(asset.blob, asset.fileName);
  return asset;
}

function defaultZipName() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  return `image-batch-${stamp}.zip`;
}

export async function downloadCardsBundle(cards) {
  const targets = cards.filter((card) => card.imageUrl);
  if (targets.length === 0) {
    throw new Error('ダウンロード可能なカードがありません。');
  }

  if (!globalThis.JSZip) {
    let success = 0;
    for (const card of targets) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await downloadSingleCard(card);
        success += 1;
      } catch {
        // continue
      }
    }
    return {
      mode: 'multiple',
      success,
      total: targets.length,
      metadataEmbedded: false
    };
  }

  const zip = new globalThis.JSZip();
  let success = 0;
  let metadataCount = 0;

  for (const card of targets) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const asset = await createDownloadAsset(card);
      zip.file(asset.fileName, asset.blob);
      success += 1;
      if (asset.metadataEmbedded) {
        metadataCount += 1;
      }
    } catch {
      // skip failed item and continue
    }
  }

  if (success === 0) {
    throw new Error('画像の取得に失敗したためダウンロードできませんでした。');
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(zipBlob, defaultZipName());

  return {
    mode: 'zip',
    success,
    total: targets.length,
    metadataEmbedded: metadataCount
  };
}
