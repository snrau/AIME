<script setup>
import { RouterView } from 'vue-router';
import PopupModal from '@/components/PopupModal.vue';
import CircleOfFifths from '@/components/CircleOfFifths.vue';
import Midioutput from '@/components/MidiOutput.vue';
import RoomSelection from '@/components/RoomSelection.vue';
import { provide, ref } from 'vue';
import { useRoomStore } from '@/stores/roomStore';
import { usePopupStore } from '@/stores/popupStore';
import HelpComponent from './components/HelpComponent.vue';

const roomStore = useRoomStore();
const popupStore = usePopupStore();

// Callback for loading rooms, will be set by HomeView
const loadRoomCallback = ref(null);

// Provide methods to save and load rooms, each save creates a new room
function handleSaveRoom(roomData) {
  roomStore.createNewRoom(roomData);
}

function handleLoadRoom(roomId) {
  const room = roomStore.loadRoom(roomId);
  if (room && loadRoomCallback.value) {
    loadRoomCallback.value(room);
    // Close the popup after loading
    popupStore.closePopup();
  }
  return room;
}

// Provide these functions to child components as injectable
provide('saveRoom', handleSaveRoom);
provide('setLoadRoomCallback', (callback) => {
  loadRoomCallback.value = callback;
});
</script>

<template>
  <RouterView />
  <PopupModal type="rooms" title="Rooms">
    <RoomSelection @load-room="handleLoadRoom" />
  </PopupModal>
  <PopupModal type="tonicKey" title="Select Rootnote">
    <CircleOfFifths />
  </PopupModal>
  <PopupModal type="output" title="Select Midioutput">
    <Midioutput />
  </PopupModal>
  <PopupModal type="help" title="Help">
    <HelpComponent />
  </PopupModal>
</template>

<style scoped></style>
