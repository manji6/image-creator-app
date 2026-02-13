export function createConsoleProvider() {
  return {
    track(data) {
      console.log('[Analytics Event]', data);
    },

    setUserProperty(key, value) {
      console.log('[Analytics User Property]', key, '=', value);
    }
  };
}
