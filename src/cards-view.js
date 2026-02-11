import { CARD_STATUSES, STATUS_LABELS } from './constants.js';
import {
  ensureActionsContainer,
  ensureDownloadButton,
  ensurePreviewButton,
  ensureRegenerateButton
} from './card-actions.js';
import { isCardRegenerateDisabled } from './generation-helpers.js';
import { statusClassName } from './utils.js';

export function renderCardsView({
  cards,
  templateBlocked,
  runningCardIds,
  isDownloadingBundle,
  refs,
  onImagePreview,
  onRegenerate,
  onPreview,
  onDownload,
  onRemove,
  onPromptChange
}) {
  refs.cardsGrid.innerHTML = '';

  if (cards.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500';
    empty.textContent = 'カードがありません。左側の一括入力から作成してください。';
    refs.cardsGrid.appendChild(empty);
    return;
  }

  for (const card of cards) {
    const fragment = refs.cardTemplate.content.cloneNode(true);
    const image = fragment.querySelector('.card-image');
    const placeholder = fragment.querySelector('.card-placeholder');
    const loader = fragment.querySelector('.loader');
    const placeholderText = fragment.querySelector('.placeholder-text');
    const provider = fragment.querySelector('.card-provider');
    const status = fragment.querySelector('.card-status');
    const prompt = fragment.querySelector('.card-prompt');
    const error = fragment.querySelector('.card-error');
    const remove = fragment.querySelector('.card-remove');
    const actions = ensureActionsContainer(fragment, remove);
    const regenerate = ensureRegenerateButton(actions, remove);
    const preview = ensurePreviewButton(actions, remove);
    const download = ensureDownloadButton(actions, remove);

    provider.textContent = card.provider ? `${card.provider} / ${card.model || 'default'}` : 'provider not selected';
    status.textContent = STATUS_LABELS[card.status] || STATUS_LABELS.pending;
    status.className = `card-status rounded-full px-2 py-1 text-xs font-semibold ${statusClassName(card.status)}`;
    prompt.value = card.prompt;

    if (card.imageUrl) {
      image.src = card.imageUrl;
      image.classList.remove('hidden');
      image.classList.add('cursor-zoom-in');
      image.addEventListener('click', () => {
        void onImagePreview(card.id);
      });
      placeholder.classList.add('hidden');
    } else {
      image.classList.add('hidden');
      image.classList.remove('cursor-zoom-in');
      placeholder.classList.remove('hidden');
      placeholderText.textContent = card.status === CARD_STATUSES.generating ? '生成中...' : '画像未生成';
      if (card.status === CARD_STATUSES.generating) {
        loader.classList.remove('hidden');
      } else {
        loader.classList.add('hidden');
      }
    }

    if (card.errorMessage) {
      error.textContent = card.errorMessage;
      error.classList.remove('hidden');
    } else {
      error.classList.add('hidden');
      error.textContent = '';
    }

    if (regenerate) {
      const isRunning = isCardRegenerateDisabled(runningCardIds, card.id);
      regenerate.disabled = isRunning || templateBlocked;
      regenerate.textContent = isRunning ? '生成中...' : '再生成';
      regenerate.addEventListener('click', () => {
        void onRegenerate(card.id);
      });
    }

    if (preview) {
      preview.addEventListener('click', () => {
        void onPreview(card.id);
      });
    }

    if (download) {
      const canDownload = Boolean(card.imageUrl) && !isDownloadingBundle;
      download.disabled = !canDownload;
      download.classList.toggle('opacity-50', !canDownload);
      download.classList.toggle('cursor-not-allowed', !canDownload);
      download.addEventListener('click', () => {
        void onDownload(card.id);
      });
    }

    if (remove) {
      remove.addEventListener('click', () => {
        void onRemove(card.id);
      });
    }

    prompt.addEventListener('change', (event) => {
      void onPromptChange(card.id, event.target.value);
    });

    refs.cardsGrid.appendChild(fragment);
  }
}
