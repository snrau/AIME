<script setup>
import HomeComponent from '../components/HomeComponent.vue';
import HeaderComponent from '../components/HeaderComponent.vue';
import { ref, inject, onMounted } from 'vue';

const homeRef = ref(null);
const saveRoom = inject('saveRoom');
const setLoadRoomCallback = inject('setLoadRoomCallback');

function handleSaveRoom() {
  if (homeRef.value) {
    const roomData = homeRef.value.getRoomData();
    saveRoom(roomData);
  }
}

function handleLoadRoom(room) {
  if (room && homeRef.value) {
    homeRef.value.loadRoomData(room);
  }
}

onMounted(() => {
  setLoadRoomCallback(handleLoadRoom);
});
</script>

<template>
  <main>
    <HeaderComponent @save-room="handleSaveRoom" />
    <HomeComponent ref="homeRef" />
  </main>
</template>
