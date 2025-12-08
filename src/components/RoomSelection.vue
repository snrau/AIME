<script setup>
import { computed, ref } from 'vue';
import { useRoomStore } from '@/stores/roomStore';

const roomStore = useRoomStore();

const emit = defineEmits(['load-room']);

// Get sorted rooms list
const roomsList = computed(() => roomStore.getRoomsList());

// Track which room is being renamed
const renamingRoomId = ref(null);
const newRoomName = ref('');

// Pagination (client based)
const currentPage = ref(0);
const roomsPerPage = 2;

// Paginated rooms
const paginatedRooms = computed(() => {
  const start = currentPage.value * roomsPerPage;
  const end = start + roomsPerPage;
  return roomsList.value.slice(start, end);
});

// Total pages
const totalPages = computed(() => Math.ceil(roomsList.value.length / roomsPerPage));

// Pagination controls
function nextPage() {
  if (currentPage.value < totalPages.value - 1) {
    currentPage.value++;
  }
}

function prevPage() {
  if (currentPage.value > 0) {
    currentPage.value--;
  }
}

function goToPage(page) {
  currentPage.value = page;
}

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Count occupied squares in grid
function countSquares(gridData) {
  if (!gridData) return 0;

  // Handle the grid history structure from gridHistoryStore
  if (gridData.history && Array.isArray(gridData.history)) {
    const currentStep =
      gridData.currentStep !== undefined ? gridData.currentStep : gridData.history.length - 1;
    const currentGrid = gridData.history[currentStep];
    return currentGrid ? currentGrid.length : 0;
  }

  // Fallback for direct grid array
  if (Array.isArray(gridData)) {
    return gridData.length;
  }

  return 0;
}

// Count melody squares
function countMelodySquares(melody) {
  if (!melody || !melody.length) return 0;
  let count = 0;
  melody.forEach((row) => {
    row.forEach((square) => {
      if (square.sequenceData) count++;
    });
  });
  return count;
}

// Count buffer squares
function countBufferSquares(buffer) {
  if (!buffer || !buffer.length) return 0;
  let count = 0;
  buffer.forEach((row) => {
    row.forEach((square) => {
      if (square.sequenceData) count++;
    });
  });
  return count;
}

// Load selected room
function selectRoom(roomId) {
  emit('load-room', roomId);
}

// Delete room with confirmation
function deleteRoom(roomId, event) {
  event.stopPropagation();
  if (confirm('Are you sure you want to delete this room?')) {
    roomStore.deleteRoom(roomId);
  }
}

// Start renaming
function startRename(roomId, currentName, event) {
  event.stopPropagation();
  renamingRoomId.value = roomId;
  newRoomName.value = currentName;
}

// Cancel renaming
function cancelRename() {
  renamingRoomId.value = null;
  newRoomName.value = '';
}

// Save new room name
function saveRename(roomId) {
  if (newRoomName.value.trim()) {
    roomStore.renameRoom(roomId, newRoomName.value.trim());
  }
  cancelRename();
}

// Check if room is current
function isCurrentRoom(roomId) {
  return roomStore.currentRoomId === roomId;
}
</script>

<template>
  <div class="room-selection">
    <div v-if="roomsList.length === 0" class="empty-state">
      <i class="fas fa-folder-open"></i>
      <p>No rooms saved yet</p>
      <p class="hint">Click the save button in the header to create your first room</p>
    </div>

    <div v-else class="rooms-container">
      <div class="rooms-grid">
        <div
          v-for="room in paginatedRooms"
          :key="room.id"
          class="room-card"
          :class="{ 'current-room': isCurrentRoom(room.id) }"
          @click="selectRoom(room.id)"
        >
          <div class="room-header">
            <div v-if="renamingRoomId === room.id" class="rename-input" @click.stop>
              <input
                v-model="newRoomName"
                @keyup.enter="saveRename(room.id)"
                @keyup.esc="cancelRename"
                @blur="saveRename(room.id)"
                autofocus
              />
            </div>
            <h3 v-else class="room-name">
              {{ room.name }}
              <span v-if="isCurrentRoom(room.id)" class="current-badge">Current</span>
            </h3>
            <div class="room-actions">
              <button
                class="action-btn rename-btn"
                @click="startRename(room.id, room.name, $event)"
                title="Rename"
              >
                <i class="fas fa-edit"></i>
              </button>
              <button
                class="action-btn delete-btn"
                @click="deleteRoom(room.id, $event)"
                title="Delete"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>

          <div class="room-stats">
            <div class="stat">
              <i class="fas fa-th"></i>
              <span>Grid: {{ countSquares(room.grid) }}</span>
            </div>
            <div class="stat">
              <i class="fas fa-music"></i>
              <span>Melody: {{ countMelodySquares(room.melody) }}</span>
            </div>
            <div class="stat">
              <i class="fas fa-layer-group"></i>
              <span
                >Buffers:
                {{ countBufferSquares(room.buffer1) + countBufferSquares(room.buffer2) }}</span
              >
            </div>
          </div>

          <div class="room-footer">
            <span class="timestamp">
              <i class="fas fa-clock"></i>
              {{ formatDate(room.updatedAt) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Pagination controls -->
      <div v-if="totalPages > 1" class="pagination">
        <button
          class="pagination-btn"
          @click="prevPage"
          :disabled="currentPage === 0"
          title="Previous page"
        >
          <i class="fas fa-chevron-left"></i>
        </button>

        <div class="pagination-dots">
          <button
            v-for="page in totalPages"
            :key="page"
            class="pagination-dot"
            :class="{ active: currentPage === page - 1 }"
            @click="goToPage(page - 1)"
            :title="`Page ${page}`"
          ></button>
        </div>

        <button
          class="pagination-btn"
          @click="nextPage"
          :disabled="currentPage === totalPages - 1"
          title="Next page"
        >
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.room-selection {
  min-height: 300px;
  max-height: 600px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.6);
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state p {
  margin: 5px 0;
}

.empty-state .hint {
  font-size: 14px;
  opacity: 0.7;
}

.rooms-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.rooms-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px 0;
  flex: 1;
}

.room-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.room-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.room-card.current-room {
  border-color: #e1e2e0;
  background: rgba(76, 175, 80, 0.1);
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 10px;
}

.room-name {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  color: white;
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.current-badge {
  font-size: 10px;
  background: #4caf50;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: normal;
}

.room-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 12px;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.delete-btn:hover {
  background: #f44336;
}

.rename-btn:hover {
  background: #2196f3;
}

.rename-input {
  flex: 1;
  margin-right: 8px;
}

.rename-input input {
  width: 100%;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  color: white;
  font-size: 16px;
  font-weight: bold;
}

.rename-input input:focus {
  outline: none;
  border-color: #2196f3;
}

.room-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
  padding: 8px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

.stat i {
  width: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.room-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timestamp {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  gap: 6px;
}

.timestamp i {
  font-size: 10px;
}

/* Pagination styles */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.pagination-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 12px;
}

.pagination-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.pagination-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.pagination-dots {
  display: flex;
  gap: 8px;
  align-items: center;
}

.pagination-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.pagination-dot:hover {
  background: rgba(255, 255, 255, 0.5);
  transform: scale(1.2);
}

.pagination-dot.active {
  background: #4caf50;
  width: 10px;
  height: 10px;
}
</style>
