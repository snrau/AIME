import { defineStore } from 'pinia';

export const useMidiPlayer = defineStore('midiplayer', {
  state: () => ({
    output: "default", // Default
  }),
  actions: {
    setMidiPlayer(player) {
      this.output = player;
    },
  },
});
