import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isCardRegenerateDisabled,
  isGenerateExistingDisabled,
  isRegenerateFailedDisabled,
  pickRunnableCardIds
} from '../src/generation-helpers.js';

test('pickRunnableCardIds removes duplicates and excludes running cards', () => {
  const running = new Set(['b']);
  const result = pickRunnableCardIds(['a', 'b', 'a', 'c', 'b'], running);
  assert.deepEqual(result, ['a', 'c']);
});

test('isGenerateExistingDisabled reflects batch lock and empty list', () => {
  assert.equal(isGenerateExistingDisabled(true, [{ id: 'x' }]), true);
  assert.equal(isGenerateExistingDisabled(false, []), true);
  assert.equal(isGenerateExistingDisabled(false, [{ id: 'x' }]), false);
});

test('isRegenerateFailedDisabled only enables when failures exist and not batch running', () => {
  const successCards = [{ id: '1', status: 'success' }];
  const failedCards = [{ id: '1', status: 'error' }];

  assert.equal(isRegenerateFailedDisabled(true, failedCards), true);
  assert.equal(isRegenerateFailedDisabled(false, successCards), true);
  assert.equal(isRegenerateFailedDisabled(false, failedCards), false);
});

test('isCardRegenerateDisabled uses per-card running set', () => {
  const running = new Set(['card-1']);
  assert.equal(isCardRegenerateDisabled(running, 'card-1'), true);
  assert.equal(isCardRegenerateDisabled(running, 'card-2'), false);
});
