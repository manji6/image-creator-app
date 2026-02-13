export function createGTMProvider(containerId) {
  // GTMスニペットがロード済みか確認
  if (!window.dataLayer) {
    console.warn('[GTM Provider] dataLayer not found. GTM snippet may not be loaded.');
    window.dataLayer = [];
  }

  return {
    track(data) {
      window.dataLayer.push(data);
    },

    setUserProperty(key, value) {
      window.dataLayer.push({
        event: 'user_property_set',
        property_name: key,
        property_value: value
      });
    }
  };
}
