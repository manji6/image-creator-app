export function createReferenceImageState() {
  return {
    fileName: '',
    mimeType: '',
    fileDataUrl: '',
    url: ''
  };
}

export function getReferenceImageValue(referenceImage) {
  const fileValue = String(referenceImage?.fileDataUrl || '').trim();
  if (fileValue) {
    return fileValue;
  }
  return String(referenceImage?.url || '').trim();
}

export function hasReferenceImageValue(referenceImage) {
  return Boolean(getReferenceImageValue(referenceImage));
}

export function parseReferenceImageUrl(rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) {
    return '';
  }

  const parsed = new URL(value);
  if (!/^https?:$/i.test(parsed.protocol) && parsed.protocol !== 'data:') {
    throw new Error('http(s) または data URL を指定してください。');
  }
  return value;
}

export async function readReferenceImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('画像ファイルの読み込みに失敗しました。'));
    reader.readAsDataURL(file);
  });
}
