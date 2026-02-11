export function stripSessionOnlySettings(settings) {
  const clone = structuredClone(settings || {});
  if (clone?.providers?.firefly) {
    clone.providers.firefly.accessToken = '';
  }
  return clone;
}
