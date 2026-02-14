export function createGTMProvider(containerId) {
  // dataLayer初期化
  if (!window.dataLayer) {
    window.dataLayer = [];
  }

  // GTMスクリプトが未読み込みの場合のみ追加
  const scriptId = `gtm-script-${containerId}`;
  if (!document.getElementById(scriptId)) {
    // dataLayerに初期イベントをプッシュ
    window.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js'
    });

    // GTMスクリプトを動的に追加
    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
    document.head.insertBefore(script, document.head.firstChild);

    console.log(`[GTM Provider] GTM script loaded dynamically: ${containerId}`);
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
