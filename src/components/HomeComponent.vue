<script setup>
import RoomComponent from './RoomComponent.vue';
import BufferComponent from './BufferComponent.vue';
import MelodyComponent from './MelodyComponent.vue';
import { ref, computed } from 'vue';
import { useModeStore } from '../stores/mode.js';

const roomRef = ref(null);
const buffer1Ref = ref(null);
const buffer2Ref = ref(null);
const melodyRef = ref(null);
const showTooltip = ref(false);
const showFeatureTooltip = ref(false);

// Mode store
const modeStore = useModeStore();

// Computed properties to check if undo/redo is available
const canUndo = computed(() => {
  return roomRef.value?.canUndo || false;
});

const canRedo = computed(() => {
  return roomRef.value?.canRedo || false;
});

function handleCopySequence({ x, y, sequenceData, target }) {
  switch (target) {
    case 'room':
      roomRef.value?.copyToSquare(x, y, sequenceData);
      break;
    case 'buffer1':
      buffer1Ref.value?.copyToSquare(x, y, sequenceData);
      break;
    case 'buffer2':
      buffer2Ref.value?.copyToSquare(x, y, sequenceData);
      break;
    case 'melody':
      melodyRef.value?.copyToSquare(x, y, sequenceData);
      break;
  }
}

// Function to handle undo button click
function handleUndoClick() {
  if (roomRef.value) {
    roomRef.value.handleUndo();
  } else {
    console.error('roomRef is not available');
  }
}

// Function to handle redo button click
function handleRedoClick() {
  if (roomRef.value) {
    roomRef.value.handleRedo();
  } else {
    console.error('roomRef is not available');
  }
}

// Get current room data for saving
function getRoomData() {
  try {
    const gridData = roomRef.value?.getGridData() || null;

    let melodyData = null;
    if (melodyRef.value?.grid) {
      const gridRef = melodyRef.value.grid;

      melodyData =
        gridRef.value !== undefined
          ? JSON.parse(JSON.stringify(gridRef.value))
          : JSON.parse(JSON.stringify(gridRef));
    }

    let buffer1Data = null;
    if (buffer1Ref.value?.grid) {
      const gridRef = buffer1Ref.value.grid;
      buffer1Data =
        gridRef.value !== undefined
          ? JSON.parse(JSON.stringify(gridRef.value))
          : JSON.parse(JSON.stringify(gridRef));
    }

    let buffer2Data = null;
    if (buffer2Ref.value?.grid) {
      const gridRef = buffer2Ref.value.grid;
      buffer2Data =
        gridRef.value !== undefined
          ? JSON.parse(JSON.stringify(gridRef.value))
          : JSON.parse(JSON.stringify(gridRef));
    }

    const roomData = {
      grid: gridData,
      melody: melodyData,
      buffer1: buffer1Data,
      buffer2: buffer2Data,
    };

    return roomData;
  } catch (error) {
    console.error('=== ERROR in getRoomData:', error);
    throw error;
  }
}

// Load room data
function loadRoomData(room) {
  // Stop melody player when switching rooms
  if (melodyRef.value?.stopPlayer) {
    melodyRef.value.stopPlayer();
  }

  if (room.grid && roomRef.value) {
    roomRef.value.loadGridData(room.grid);
  }
  if (room.melody && melodyRef.value?.grid) {
    melodyRef.value.grid.value = JSON.parse(JSON.stringify(room.melody));
  }
  if (room.buffer1 && buffer1Ref.value?.grid) {
    buffer1Ref.value.grid.value = JSON.parse(JSON.stringify(room.buffer1));
  }
  if (room.buffer2 && buffer2Ref.value?.grid) {
    buffer2Ref.value.grid.value = JSON.parse(JSON.stringify(room.buffer2));
  }
}

defineExpose({
  getRoomData,
  loadRoomData,
});
</script>

<template>
  <div class="home-container flex-center-horizontally">
    <div class="home-components-wrapper flex-center-horizontally">
      <div class="action-buttons-left">
        <div class="action-buttons-btn-group">
          <button class="btn undo-redo-btn" @click="handleUndoClick" :disabled="!canUndo">
            <span class="undo-redo-btn-text">Undo</span>
          </button>
          <button class="btn undo-redo-btn" @click="handleRedoClick" :disabled="!canRedo">
            <span class="undo-redo-btn-text">Redo</span>
          </button>
        </div>
        <BufferComponent ref="buffer1Ref" title="Buffer 1" @copy-sequence="handleCopySequence" />
      </div>
      <RoomComponent ref="roomRef" @copy-sequence="handleCopySequence" />
      <div class="action-buttons-right">
        <div class="action-buttons-btn-group">
          <div class="toggle-buttons-row">
            <div class="tooltip-wrapper">
              <button
                class="btn"
                :class="{ 'highlighted-create-mode': modeStore.isFeatureMode }"
                @click="modeStore.toggleFeatureMode()"
                @mouseenter="showFeatureTooltip = true"
                @mouseleave="showFeatureTooltip = false"
              >
                <i class="fas fa-pencil-alt"></i>
              </button>
              <span v-show="showFeatureTooltip" class="tooltip-text">Toggle Draw Mode</span>
            </div>
            <div class="tooltip-wrapper">
              <button
                class="btn"
                :class="{ 'highlighted-create-mode': modeStore.isCreateMode }"
                @click="modeStore.toggleCreateMode()"
                @mouseenter="showTooltip = true"
                @mouseleave="showTooltip = false"
              >
                <i class="fas fa-magic"></i>
              </button>
              <span v-show="showTooltip" class="tooltip-text">Toggle Create Mode</span>
            </div>
          </div>
          <div class="mode-slider">
            <input
              type="checkbox"
              :checked="modeStore.isRemoveMode"
              @change="modeStore.toggleCopyRemoveMode()"
              id="mode-toggle"
            />
            <label for="mode-toggle" class="slider-label">
              <span class="slider-track">
                <span class="slider-thumb"></span>
              </span>
              <span class="mode-text">{{
                modeStore.copyRemoveMode === 'remove' ? 'Remove' : 'Copy'
              }}</span>
            </label>
          </div>
        </div>

        <BufferComponent ref="buffer2Ref" title="Buffer 2" @copy-sequence="handleCopySequence" />
      </div>
    </div>
    <div class="melody-container">
      <MelodyComponent ref="melodyRef" @copy-sequence="handleCopySequence" />
    </div>
  </div>
</template>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}

.home-components-wrapper {
  display: flex;
  margin-top: 55px;
  width: 80%;
  flex: 1 0 auto;
}

.action-buttons-btn-group {
  height: 100px;
  margin-bottom: 20px;
}

.action-buttons-left,
.action-buttons-right {
  margin-top: 37px;
  display: flex;
  flex-direction: column;
}

.action-buttons-left {
  margin-right: 50px;
}

.action-buttons-right .action-buttons-btn-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.action-buttons-right .action-buttons-btn-group button {
  height: 25px;
  width: 25px;
  border-radius: 5px;
  transform: none;
  background-color: #fbfbfb;
  filter: brightness(0.8);
  box-shadow: 0 0 1px 1px #000000;
  color: #000000;
}

.action-buttons-right .action-buttons-btn-group button:hover {
  opacity: 0.7;
}

.highlighted-create-mode {
  box-shadow: 0 0 2px 1px #000000;
  filter: unset !important;
  transform: scale(1.1) !important;
}

.toggle-buttons-row {
  display: flex;
  gap: 10px;
  justify-content: center;
  align-items: center;
}

.action-buttons-right {
  margin-left: 50px;
}

.action-buttons-left .action-buttons-btn-group {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.action-buttons-left .action-buttons-btn-group button {
  border: solid 1px var(--border-color);
  border-radius: 5px;
  height: 30px;
  width: 150px;
  background-color: white;
  color: var(--text-color);
}

.action-buttons-btn-group button:not(:first-child) {
  margin-top: 15px;
}

.action-buttons-btn-group button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.melody-container {
  width: 1229px;
  margin-top: 25px;
}

.mode-slider {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 25px;
}

.mode-slider input {
  display: none;
}

.slider-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  color: white;
}

.slider-track {
  width: 50px;
  height: 24px;
  background-color: #ccc;
  border-radius: 12px;
  position: relative;
  transition: background-color 0.3s ease;
  display: flex;
  align-items: center;
}

.slider-thumb {
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  position: absolute;
  left: 2px;
  transition: transform 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.mode-slider input:checked + .slider-label .slider-track {
  background-color: #ff6b6b;
}

.mode-slider input:checked + .slider-label .slider-thumb {
  transform: translateX(26px);
}

.mode-slider input:not(:checked) + .slider-label .slider-track {
  background-color: #4ebccd;
}

.mode-text {
  margin-top: 8px;
  font-weight: 500;
  text-transform: capitalize;
  color: var(--text-color);
  font-size: 13px;
  font-weight: bold;
  color: var(--text-color);
}

.tooltip-wrapper {
  position: relative;
  display: inline-block;
}

.tooltip-text {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  padding: 6px 10px;
  background-color: rgba(0, 0, 0, 0.85);
  color: white;
  font-size: 12px;
  border-radius: 4px;
  white-space: nowrap;
  z-index: 1000;
  pointer-events: none;
}

.tooltip-text::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.85);
}

.undo-redo-btn-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color);
  opacity: 0.7;
}

@media (max-width: 1200px) {
  .action-buttons-left {
    margin-right: 30px !important;
  }
  .action-buttons-right {
    margin-left: 30px !important;
  }

  .action-buttons-left .action-buttons-btn-group button {
    width: 80px;
  }

  .action-buttons-left .action-buttons-btn-group {
    margin: auto;
  }
}

@media (max-width: 1100px) {
}

@media (max-width: 768px) {
  .home-components-wrapper {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    width: 100%;
  }

  .home-components-wrapper > :nth-child(2) {
    order: 1;
  }

  .action-buttons-left {
    order: 2;
    margin: 20px 10px 0 0 !important;
    width: auto;
    flex: 0 1 auto;
  }

  .action-buttons-right {
    order: 3;
    margin: 20px 0 0 10px !important;
    width: auto;
    flex: 0 1 auto;
  }

  .action-buttons-left .action-buttons-btn-group,
  .action-buttons-right .action-buttons-btn-group {
    width: auto;
  }

  .action-buttons-left .action-buttons-btn-group button {
    width: auto;
    min-width: 100px;
  }
}
</style>
