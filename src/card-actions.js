const REGENERATE_CLASS =
  'card-regenerate inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400';
const DOWNLOAD_CLASS =
  'card-download inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400';
const PREVIEW_CLASS =
  'card-preview inline-flex items-center justify-center rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition hover:border-blue-400 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300';

export function ensureActionsContainer(fragment, removeButton) {
  let actions = fragment.querySelector('.card-actions');
  if (actions) {
    return actions;
  }
  if (!removeButton?.parentElement) {
    return null;
  }
  actions = document.createElement('div');
  actions.className = 'card-actions mt-3 flex items-center gap-2 opacity-100';
  removeButton.parentElement.insertBefore(actions, removeButton);
  actions.appendChild(removeButton);
  return actions;
}

export function ensureRegenerateButton(actions, removeButton) {
  let regenerate = actions?.querySelector('.card-regenerate');
  if (regenerate) {
    return regenerate;
  }

  regenerate = document.createElement('button');
  regenerate.type = 'button';
  regenerate.className = REGENERATE_CLASS;
  regenerate.textContent = '生成';

  if (removeButton && removeButton.parentElement === actions) {
    actions.insertBefore(regenerate, removeButton);
  } else if (actions) {
    actions.appendChild(regenerate);
  }
  return regenerate;
}

export function ensureDownloadButton(actions, removeButton) {
  let download = actions?.querySelector('.card-download');
  if (download) {
    return download;
  }

  download = document.createElement('button');
  download.type = 'button';
  download.className = DOWNLOAD_CLASS;
  download.textContent = 'DL';

  if (removeButton && removeButton.parentElement === actions) {
    actions.insertBefore(download, removeButton);
  } else if (actions) {
    actions.appendChild(download);
  }
  return download;
}

export function ensurePreviewButton(actions, removeButton) {
  let preview = actions?.querySelector('.card-preview');
  if (preview) {
    return preview;
  }

  preview = document.createElement('button');
  preview.type = 'button';
  preview.className = PREVIEW_CLASS;
  preview.textContent = 'プロンプトプレビュー';

  if (removeButton && removeButton.parentElement === actions) {
    actions.insertBefore(preview, removeButton);
  } else if (actions) {
    actions.appendChild(preview);
  }
  return preview;
}
