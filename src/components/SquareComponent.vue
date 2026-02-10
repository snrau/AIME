<script setup>
import { Colors } from '@/constants/colors';
import DrawComponent from './DrawComponent.vue';
import SequencePreview from './SequencePreview.vue';
import { ref, onMounted, watch } from 'vue';
import { useModeStore } from '@/stores/mode.js';
import { cloneSequence } from '@/utils/cloneUtils';

const props = defineProps({
  color: Colors,
  height: Number,
  width: Number,
  margin: Number,
  sequenceData: Object,
  firstSquare: Boolean,
  x: Number,
  y: Number,
  isLoading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'first-square-sequence-generated',
  'pull-square',
  'copy-sequence',
  'pull-preview',
  'pull-end',
  'sequence-updated',
  'remove-square',
]);

const modeStore = useModeStore();

const showDrawComponent = ref(false);
const storedSequenceData = ref(null);
const isDragging = ref(false);
const startDragPosition = ref({ x: 0, y: 0 });
const dragThreshold = 20; // Minimum drag distance to trigger pull action
let currentDragDirection = null;

const ghostVisible = ref(false);
const ghostPosition = ref({ x: 0, y: 0 });

let draggedSequenceData = null;

// Add sequenceData on mount if passed via props
onMounted(() => {
  if (props.sequenceData) {
    storedSequenceData.value = props.sequenceData;
  }
});

// update sequence data on change
watch(
  () => props.sequenceData,
  (newSequenceData) => {
    if (newSequenceData) {
      storedSequenceData.value = newSequenceData;
    }
    if (!newSequenceData) {
      storedSequenceData.value = null;
    }
  }
);

// Handle sequence generation from DrawComponent
function handleSequenceGenerated(generatedSequence) {
  storedSequenceData.value = generatedSequence;

  // Emit event to update the grid with the new sequence data
  emit('sequence-updated', { x: props.x, y: props.y, sequenceData: generatedSequence });

  // Emit event if this is the first square
  if (props.firstSquare) {
    emit('first-square-sequence-generated', generatedSequence);
  }

  showDrawComponent.value = false;
}

// Mouse event handlers for pull functionality
function onMouseDown(event) {
  // Only handle left mouse button
  if (event.button !== 0) return;

  // Start tracking the drag
  isDragging.value = true;
  startDragPosition.value = { x: event.clientX, y: event.clientY };
  currentDragDirection = null;

  emit('pull-preview', { direction: null, x: props.x, y: props.y, target:{x:props.x, y: props.y}});

  // Visibility of ghost square
  ghostVisible.value = true;
  ghostPosition.value = { x: event.clientX, y: event.clientY };

  draggedSequenceData = storedSequenceData.value
    ? cloneSequence(storedSequenceData.value)
    : null;

  // Add global event listeners
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  // Prevent default to avoid text selection
  event.preventDefault();
}

// Touch event handlers for pull functionality
function onTouchStart(event) {
  const touch = event.touches[0];

  // Start tracking the drag
  isDragging.value = true;
  startDragPosition.value = { x: touch.clientX, y: touch.clientY };
  currentDragDirection = null;

  emit('pull-preview', { direction: null, x: props.x, y: props.y, target:{x:props.x, y: props.y} });

  // Visibility of ghost square
  ghostVisible.value = true;
  ghostPosition.value = { x: touch.clientX, y: touch.clientY };

  draggedSequenceData = storedSequenceData.value
    ? cloneSequence(storedSequenceData.value)
    : null;

  // Add global event listeners
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd);
  document.addEventListener('touchcancel', onTouchEnd);

  // Prevent default to avoid text selection and scrolling
  event.preventDefault();
}

function onMouseMove(event) {
  if (!isDragging.value) return;

  const deltaX = event.clientX - startDragPosition.value.x;
  const deltaY = event.clientY - startDragPosition.value.y;

  // Move ghost square with mouse
  ghostPosition.value = { x: event.clientX, y: event.clientY };

  // Check if we have moved beyond the threshold
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  const target = findClosestCell(event);

  if(target){
    if (distance > dragThreshold) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        currentDragDirection = deltaX > 0 ? 'left' : 'right';
      } else {
        currentDragDirection = deltaY > 0 ? 'up' : 'down';
      }
      emit('pull-preview', { direction: currentDragDirection, x: props.x, y: props.y, target:target });
    }else{
      currentDragDirection = null
      emit('pull-preview', { direction: null, x: props.x, y: props.y, target:{x:props.x, y: props.y} });
    }
  }else{
    emit('pull-end')
  }
}

function onTouchMove(event) {
  if (!isDragging.value) return;

  const touch = event.touches[0];
  const deltaX = touch.clientX - startDragPosition.value.x;
  const deltaY = touch.clientY - startDragPosition.value.y;

  // Move ghost square with touch
  ghostPosition.value = { x: touch.clientX, y: touch.clientY };

  // Check if we have moved beyond the threshold
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  const target = findClosestCell(touch)

  if(target){
    if (distance > dragThreshold) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        currentDragDirection = deltaX > 0 ? 'left' : 'right';
      } else {
        currentDragDirection = deltaY > 0 ? 'up' : 'down';
      }
      emit('pull-preview', { direction: currentDragDirection, x: props.x, y: props.y, target:target });
    } else{
      currentDragDirection = null
      emit('pull-preview', { direction: null, x: props.x, y: props.y, target:{x:props.x, y: props.y} });
    }
  }else{
    emit('pull-end')
  }

  // Prevent default to avoid scrolling
  event.preventDefault();
}

function findClosestCell(event){
  if (!isDragging.value) return;

  let didCopy = false;

  // Check if above grid container
  const node = document.elementFromPoint(event.clientX, event.clientY);
  const container = node ? node.closest('[data-component]') : null;

  if (container && container?.classList?.contains('grid-container') && modeStore.isCopyMode) {
    let targetX, targetY;

    // Try to find a square element first
    const targetElement = node ? node.closest('.square') : null;

    if (targetElement) {
      // If we found a square, use its coordinates
      targetX = parseInt(targetElement.dataset.x, 10);
      targetY = parseInt(targetElement.dataset.y, 10);
    } else {
      // find the grid container and calculate position
      const gridContainer = container.querySelector('.grid-container') || container;

      if (gridContainer) {
        const gridRect = gridContainer.getBoundingClientRect();

        // Mouse position relative to grid container
        const mouseX = event.clientX - gridRect.left;
        const mouseY = event.clientY - gridRect.top;

        // Find the first grid cell to determine actual cell dimensions
        const firstCell = gridContainer.querySelector('.grid-cell, .square-cell');
        if (firstCell) {
          const cellRect = firstCell.getBoundingClientRect();
          const actualCellWidth = cellRect.width;
          const actualCellHeight = cellRect.height;

          // Calculate grid coordinates by dividing mouse position by actual cell size
          targetX = Math.floor(mouseX / actualCellWidth);
          targetY = Math.floor(mouseY / actualCellHeight);

          // Get grid bounds
          const componentType = container.dataset.component;
          let maxCols, maxRows;

          if (componentType === 'room') {
            maxCols = 11;
            maxRows = 7;
          } else if (componentType === 'melody') {
            maxCols = 13;
            maxRows = 1;
          } else if (componentType === 'buffer1' || componentType === 'buffer2') {
            maxCols = 1;
            maxRows = 5;
          } else {
            // Count cells from DOM
            const allRows = gridContainer.querySelectorAll('.grid-row, .room-row');
            maxRows = allRows.length;
            if (allRows.length > 0) {
              maxCols = allRows[0].querySelectorAll('.grid-cell, .square-cell').length;
            } else {
              maxCols = 1;
            }
          }

          // Clamp to grid bounds
          targetX = Math.max(0, Math.min(maxCols - 1, targetX));
          targetY = Math.max(0, Math.min(maxRows - 1, targetY));
        }
      }
    }
    return {x: targetX, y:targetY}
  }
  return null
}

function onMouseUp(event) {
  if (!isDragging.value) return;

  let didCopy = false;

  // Check if above grid container
  const node = document.elementFromPoint(event.clientX, event.clientY);
  const container = node ? node.closest('[data-component]') : null;

  if (container && modeStore.isCopyMode) {
    let targetX, targetY;

    // Try to find a square element first
    const targetElement = node ? node.closest('.square') : null;

    if (targetElement) {
      // If we found a square, use its coordinates
      targetX = parseInt(targetElement.dataset.x, 10);
      targetY = parseInt(targetElement.dataset.y, 10);
    } else {
      // find the grid container and calculate position
      const gridContainer = container.querySelector('.grid-container') || container;

      if (gridContainer) {
        const gridRect = gridContainer.getBoundingClientRect();

        // Mouse position relative to grid container
        const mouseX = event.clientX - gridRect.left;
        const mouseY = event.clientY - gridRect.top;

        // Find the first grid cell to determine actual cell dimensions
        const firstCell = gridContainer.querySelector('.grid-cell, .square-cell');
        if (firstCell) {
          const cellRect = firstCell.getBoundingClientRect();
          const actualCellWidth = cellRect.width;
          const actualCellHeight = cellRect.height;

          // Calculate grid coordinates by dividing mouse position by actual cell size
          targetX = Math.floor(mouseX / actualCellWidth);
          targetY = Math.floor(mouseY / actualCellHeight);

          // Get grid bounds
          const componentType = container.dataset.component;
          let maxCols, maxRows;

          if (componentType === 'room') {
            maxCols = 11;
            maxRows = 7;
          } else if (componentType === 'melody') {
            maxCols = 13;
            maxRows = 1;
          } else if (componentType === 'buffer1' || componentType === 'buffer2') {
            maxCols = 1;
            maxRows = 5;
          } else {
            // Count cells from DOM
            const allRows = gridContainer.querySelectorAll('.grid-row, .room-row');
            maxRows = allRows.length;
            if (allRows.length > 0) {
              maxCols = allRows[0].querySelectorAll('.grid-cell, .square-cell').length;
            } else {
              maxCols = 1;
            }
          }

          // Clamp to grid bounds
          targetX = Math.max(0, Math.min(maxCols - 1, targetX));
          targetY = Math.max(0, Math.min(maxRows - 1, targetY));
        }
      }
    }

    const target = container.dataset.component;

    if (
      targetX !== undefined &&
      targetY !== undefined &&
      (targetX !== props.x || targetY !== props.y) &&
      draggedSequenceData
    ) {
      emit('copy-sequence', {
        x: targetX,
        y: targetY,
        sequenceData: draggedSequenceData,
        target,
      });
      didCopy = true;
    }
  }

  // Check if we ended over buffer or melody
  const isOverBufferOrMelody =
    container &&
    (container.dataset.component === 'buffer1' ||
      container.dataset.component === 'buffer2' ||
      container.dataset.component === 'melody');

  // Never allow pull when over buffer/melody
  if (currentDragDirection && !isOverBufferOrMelody) {
    const finalDeltaX = event.clientX - startDragPosition.value.x;
    const finalDeltaY = event.clientY - startDragPosition.value.y;

    // Calculate pull strength based on grid cells dragged
    const squareWidth = props.width + 2; // width + 2*margin
    const squareHeight = props.height + 2; // height + 2*margin

    // Calculate how many grid cells were dragged
    let gridCellsDragged;
    if (Math.abs(finalDeltaX) > Math.abs(finalDeltaY)) {
      // Horizontal drag
      gridCellsDragged = Math.abs(finalDeltaX) / squareWidth;
    } else {
      // Vertical drag
      gridCellsDragged = Math.abs(finalDeltaY) / squareHeight;
    }

    // Round to nearest integer and ensure it's at least 1, max 5
    const pullStrength = Math.min(5, Math.max(0, Math.round(gridCellsDragged)));

    emit('pull-square', {
      x: props.x,
      y: props.y,
      direction: currentDragDirection,
      sequenceData: storedSequenceData.value,
      pullStrength: pullStrength, // Add pull strength based on drag distance
    });
  }

  // If we didn't drag far enough, treat it as a regular click
  if (!didCopy && !currentDragDirection) {
    // Check if remove mode is active
    if (modeStore.isRemoveMode) {
      // Emit remove event and prevent other actions
      let target = 'grid';
      if (container && container.dataset.component === 'melody') target = 'melody';
      emit('remove-square', { x: props.x, y: props.y, target: target });
    } else {
      // toggle draw component
      showDrawComponent.value = !showDrawComponent.value;
    }
  }

  // Clean up
  emit('pull-end');
  ghostVisible.value = false;
  isDragging.value = false;
  currentDragDirection = null;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
}

function onTouchEnd(event) {
  if (!isDragging.value) return;

  let didCopy = false;

  // Get the touch position (use changedTouches since touches array is empty on touchend)
  const touch = event.changedTouches[0];

  // Check if above grid container
  const node = document.elementFromPoint(touch.clientX, touch.clientY);
  const container = node ? node.closest('[data-component]') : null;

  if (container && modeStore.isCopyMode) {
    let targetX, targetY;

    // Try to find a square element first
    const targetElement = node ? node.closest('.square') : null;

    if (targetElement) {
      // If we found a square, use its coordinates
      targetX = parseInt(targetElement.dataset.x, 10);
      targetY = parseInt(targetElement.dataset.y, 10);
    } else {
      // find the grid container and calculate position
      const gridContainer = container.querySelector('.grid-container') || container;

      if (gridContainer) {
        const gridRect = gridContainer.getBoundingClientRect();

        // Touch position relative to grid container
        const touchX = touch.clientX - gridRect.left;
        const touchY = touch.clientY - gridRect.top;

        // Find the first grid cell to determine actual cell dimensions
        const firstCell = gridContainer.querySelector('.grid-cell, .square-cell');
        if (firstCell) {
          const cellRect = firstCell.getBoundingClientRect();
          const actualCellWidth = cellRect.width;
          const actualCellHeight = cellRect.height;

          // Calculate grid coordinates by dividing touch position by actual cell size
          targetX = Math.floor(touchX / actualCellWidth);
          targetY = Math.floor(touchY / actualCellHeight);

          // Get grid bounds
          const componentType = container.dataset.component;
          let maxCols, maxRows;

          if (componentType === 'room') {
            maxCols = 11;
            maxRows = 7;
          } else if (componentType === 'melody') {
            maxCols = 13;
            maxRows = 1;
          } else if (componentType === 'buffer1' || componentType === 'buffer2') {
            maxCols = 1;
            maxRows = 5;
          } else {
            // Count cells from DOM
            const allRows = gridContainer.querySelectorAll('.grid-row, .room-row');
            maxRows = allRows.length;
            if (allRows.length > 0) {
              maxCols = allRows[0].querySelectorAll('.grid-cell, .square-cell').length;
            } else {
              maxCols = 1;
            }
          }

          // Clamp to grid bounds
          targetX = Math.max(0, Math.min(maxCols - 1, targetX));
          targetY = Math.max(0, Math.min(maxRows - 1, targetY));
        }
      }
    }

    const target = container.dataset.component;

    if (
      targetX !== undefined &&
      targetY !== undefined &&
      (targetX !== props.x || targetY !== props.y) &&
      draggedSequenceData
    ) {
      emit('copy-sequence', {
        x: targetX,
        y: targetY,
        sequenceData: draggedSequenceData,
        target,
      });
      didCopy = true;
    }
  }

  // Check if we ended over buffer or melody
  const isOverBufferOrMelody =
    container &&
    (container.dataset.component === 'buffer1' ||
      container.dataset.component === 'buffer2' ||
      container.dataset.component === 'melody');

  // Never allow pull when over buffer/melody
  if (currentDragDirection && !isOverBufferOrMelody) {
    const finalDeltaX = touch.clientX - startDragPosition.value.x;
    const finalDeltaY = touch.clientY - startDragPosition.value.y;

    // Calculate pull strength based on grid cells dragged
    const squareWidth = props.width + 2; // width + 2*margin
    const squareHeight = props.height + 2; // height + 2*margin

    // Calculate how many grid cells were dragged
    let gridCellsDragged;
    if (Math.abs(finalDeltaX) > Math.abs(finalDeltaY)) {
      // Horizontal drag
      gridCellsDragged = Math.abs(finalDeltaX) / squareWidth;
    } else {
      // Vertical drag
      gridCellsDragged = Math.abs(finalDeltaY) / squareHeight;
    }

    // Round to nearest integer and ensure it's at least 1, max 5
    const pullStrength = Math.min(5, Math.max(0, Math.round(gridCellsDragged)));

    emit('pull-square', {
      x: props.x,
      y: props.y,
      direction: currentDragDirection,
      sequenceData: storedSequenceData.value,
      pullStrength: pullStrength, // Add pull strength based on drag distance
    });
  }

  // If we didn't drag far enough, treat it as a regular tap
  if (!didCopy && !currentDragDirection) {
    // Check if remove mode is active
    if (modeStore.isRemoveMode) {
      // Emit remove event and prevent other actions
      let target = 'grid';
      if (container && container.dataset.component === 'melody') target = 'melody';
      emit('remove-square', { x: props.x, y: props.y, target: target });
    } else {
      // Normal tap behavior: toggle draw component
      showDrawComponent.value = !showDrawComponent.value;
    }
  }

  // Clean up
  emit('pull-end');
  ghostVisible.value = false;
  isDragging.value = false;
  currentDragDirection = null;
  document.removeEventListener('touchmove', onTouchMove);
  document.removeEventListener('touchend', onTouchEnd);
  document.removeEventListener('touchcancel', onTouchEnd);
}
</script>

<template>
  <div
    class="square"
    :data-x="x"
    :data-y="y"
    :style="{
      backgroundColor: color,
      height: height + 'px',
      width: width + 'px',
      margin: margin + 'px',
    }"
    @mousedown="onMouseDown"
    @touchstart="onTouchStart"
  >
    <!-- Loading spinner -->
    <div v-if="isLoading" class="loading-spinner"></div>

    <!-- Sequence preview chart -->
    <SequencePreview
      v-if="storedSequenceData && storedSequenceData.notes && storedSequenceData.notes.length > 0"
      :sequence-data="storedSequenceData"
      :width="width - 20"
      :height="height - 20"
    />
  </div>

  <div
    v-if="ghostVisible"
    class="ghost-square"
    :style="{
      position: 'fixed',
      top: ghostPosition.y - height / 2 + 'px',
      left: ghostPosition.x - width / 2 + 'px',
      width: width + 'px',
      height: height + 'px',
      backgroundColor: 'rgba(100, 100, 100, 0.3)',
      border: '1px dashed #999',
      borderRadius: '10px',
      pointerEvents: 'none',
      zIndex: 999,
    }"
  ></div>

  <DrawComponent
    v-if="showDrawComponent"
    :sequence-data="storedSequenceData"
    @close="showDrawComponent = !showDrawComponent"
    @sequence-generated="handleSequenceGenerated"
  />
</template>

<style scoped>
.square {
  border-radius: 10px;
  border: solid 1px var(--border-color);
  position: relative;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

.square:hover {
  opacity: 0.6;
  cursor: pointer;
}

/* Touch-specific active state for better feedback on mobile */
.square:active {
  opacity: 0.7;
}

.loading-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-left: 2px solid #333;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  100% {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}
</style>
