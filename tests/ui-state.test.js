import test from 'node:test';
import assert from 'node:assert/strict';

import { buildStatusSummary, getStatusCounts, globalMessageClasses } from '../src/ui-state.js';

test('getStatusCounts aggregates known statuses', () => {
  const counts = getStatusCounts([
    { status: 'pending' },
    { status: 'success' },
    { status: 'success' },
    { status: 'error' },
    { status: 'unknown' }
  ]);

  assert.deepEqual(counts, {
    pending: 1,
    generating: 0,
    success: 2,
    error: 1
  });
});

test('buildStatusSummary returns ready text for empty list', () => {
  const summary = buildStatusSummary([]);
  assert.equal(summary.queuedText, '0 queued');
  assert.equal(summary.summaryText, 'Ready');
});

test('buildStatusSummary returns counts text for non-empty list', () => {
  const summary = buildStatusSummary([
    { status: 'pending' },
    { status: 'success' },
    { status: 'error' }
  ]);

  assert.equal(summary.queuedText, '1 queued');
  assert.equal(summary.summaryText, '3 cards | done 1 | generating 0 | error 1');
});

test('globalMessageClasses maps type to tailwind classes', () => {
  assert.deepEqual(globalMessageClasses('error'), ['border-red-200', 'bg-red-50', 'text-red-700']);
  assert.deepEqual(globalMessageClasses('success'), ['border-teal-200', 'bg-teal-50', 'text-teal-700']);
  assert.deepEqual(globalMessageClasses('info'), ['border-slate-200', 'bg-slate-50', 'text-slate-700']);
});
