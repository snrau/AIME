import { defineStore } from 'pinia';

export const useTonicKeyStore = defineStore('tonicKey', {
  state: () => ({
    tonicKey: 'C', // Default tonic key
  }),
  actions: {
    setTonicKey(key) {
      this.tonicKey = key;
    },
  },
});
