import { defineStore } from 'pinia';

export const usePopupStore = defineStore('popup', {
  state: () => ({
    activePopup: null, // name/type of popup
  }),
  actions: {
    openPopup(type) {
      this.activePopup = type;
    },
    closePopup() {
      this.activePopup = null;
    },
  },
});
