<script setup>
import { usePopupStore } from '@/stores/popupStore';
import { useTonicKeyStore } from '@/stores/tonicKey';
import { useMidiPlayer } from '@/stores/midioutput';
import { computed } from 'vue';

const store = usePopupStore();
const tonicKeyStore = useTonicKeyStore();
const midioutput = useMidiPlayer();

const emit = defineEmits(['save-room']);

const openRooms = () => store.openPopup('rooms');
const openTonicKey = () => store.openPopup('tonicKey');
const openOutput = () => store.openPopup('output');
const openHelp = () => store.openPopup('help');
const saveRoom = () => emit('save-room');

const currentTonicKey = computed(() => tonicKeyStore.tonicKey);
const currentOutput = computed(() => midioutput.output);
</script>

<template>
  <div class="header-container flex-center-full">
    <div class="room-btn-container">
      <button class="btn" @click="saveRoom" title="Save Room">
        <i class="fas fa-save"></i>
      </button>
      <button class="btn" @click="openRooms">Rooms</button>
      <button class="btn tonic-key-btn" @click="openTonicKey">
        Tonic Key: {{ currentTonicKey }}
      </button>
      <button class="btn output-btn" @click="openOutput">
        Output: {{ currentOutput }}
      </button>
    </div>
    <div class="settings-btn-container">
      <button class="btn" @click="openHelp"><i class="fas fa-question-circle"></i></button>
    </div>
  </div>
</template>

<style scoped>
.header-container {
  justify-content: space-between;
  border-bottom: 1px solid black;
  height: 5vh;
  background-color: var(--header-bg-color);
}

.header-container button {
  background-color: transparent;
  color: white;
  font-weight: bold;
}

.room-btn-container {
  margin-left: 15px;
}

.settings-btn-container {
  margin-right: 15px;
}
</style>
