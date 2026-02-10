import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useRoomStore = defineStore('room', () => {
  // Array of saved rooms
  const rooms = ref([]);

  // Currently selected room ID
  const currentRoomId = ref(null);

  // Room counter for generating IDs
  const roomCounter = ref(1);

  function saveRoom(roomData) {
    const timestamp = new Date().toISOString();


    const newRoom = {
      id: `room-${roomCounter.value++}`,
      name: `Room ${roomCounter.value - 1}`,
      grid: roomData.grid,
      melody: roomData.melody,
      buffer1: roomData.buffer1,
      buffer2: roomData.buffer2,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    console.log('newRoom', newRoom)

    rooms.value.push(newRoom);
    currentRoomId.value = newRoom.id;
    return newRoom;
  }

  function createNewRoom(roomData) {
    return saveRoom(roomData);
  }

  function loadRoom(roomId) {
    const room = rooms.value.find((r) => r.id === roomId);
    console.log('loadRoom', roomId, room);
    if (room) {
      currentRoomId.value = roomId;
      return room;
    }
    return null;
  }

  function deleteRoom(roomId) {
    const index = rooms.value.findIndex((r) => r.id === roomId);
    if (index !== -1) {
      rooms.value.splice(index, 1);
      if (currentRoomId.value === roomId) {
        currentRoomId.value = null;
      }
      return true;
    }
    return false;
  }

  function renameRoom(roomId, newName) {
    const room = rooms.value.find((r) => r.id === roomId);
    if (room) {
      room.name = newName;
      room.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  function getCurrentRoom() {
    if (currentRoomId.value) {
      return rooms.value.find((r) => r.id === currentRoomId.value);
    }
    return null;
  }

  // Get all rooms sorted by update time
  function getRoomsList() {
    return [...rooms.value].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  return {
    rooms,
    currentRoomId,
    saveRoom,
    createNewRoom,
    loadRoom,
    deleteRoom,
    renameRoom,
    getCurrentRoom,
    getRoomsList,
  };
});
