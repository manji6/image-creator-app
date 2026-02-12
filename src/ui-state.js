export function getStatusCounts(cards) {
  const counts = {
    pending: 0,
    generating: 0,
    success: 0,
    error: 0
  };

  for (const card of cards) {
    if (counts[card.status] === undefined) {
      continue;
    }
    counts[card.status] += 1;
  }
  return counts;
}

export function buildStatusSummary(cards) {
  const counts = getStatusCounts(cards);
  const total = cards.length;

  if (total === 0) {
    return {
      summaryText: 'Ready',
      counts
    };
  }

  return {
    summaryText: `${total} cards | done ${counts.success} | generating ${counts.generating} | error ${counts.error}`,
    counts
  };
}

export function globalMessageClasses(type) {
  if (type === 'error') {
    return ['border-red-200', 'bg-red-50', 'text-red-700'];
  }
  if (type === 'success') {
    return ['border-teal-200', 'bg-teal-50', 'text-teal-700'];
  }
  return ['border-slate-200', 'bg-slate-50', 'text-slate-700'];
}
