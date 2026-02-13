export function createNoopProvider() {
  return {
    track() {
      // Do nothing
    },

    setUserProperty() {
      // Do nothing
    }
  };
}
