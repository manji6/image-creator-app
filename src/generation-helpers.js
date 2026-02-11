import { CARD_STATUSES } from './constants.js';

export function pickRunnableCardIds(cardIds, runningCardIds) {
  return [...new Set(cardIds)].filter((cardId) => !runningCardIds.has(cardId));
}

export function isGenerateExistingDisabled(isBatchGenerating, cards) {
  return isBatchGenerating || cards.length === 0;
}

export function isRegenerateFailedDisabled(isBatchGenerating, cards) {
  return isBatchGenerating || !cards.some((card) => card.status === CARD_STATUSES.error);
}

export function isCardRegenerateDisabled(runningCardIds, cardId) {
  return runningCardIds.has(cardId);
}
