<script setup>
import SquareComponent from './SquareComponent.vue';
import { Colors } from '@/constants/colors';
import { ref, watch } from 'vue';
import { useResponsiveBuffer } from '@/utils/gridUtils';
import { cloneSequence } from '@/utils/cloneUtils';

defineProps({
  title: String,
});

// Use responsive buffer configuration
const {
  rows,
  cols,
  squareHeight,
  squareWidth,
  squareMargin,
  roomContainerWidth,
  roomContainerHeight,
} = useResponsiveBuffer();

// Create a 2D array to represent the grid
const grid = ref(
  Array.from({ length: rows.value }, (_, row) =>
    Array.from({ length: cols.value }, (_, col) => ({
      id: `${row}-${col}`,
      color: Colors.BLUE,
      sequenceData: null,
    }))
  )
);

// Watch for changes in rows/cols and regenerate grid
watch([rows, cols], ([newRows, newCols]) => {
  // Save existing sequence data
  const oldData = new Map();
  grid.value.forEach((row, y) => {
    row.forEach((square, x) => {
      if (square.sequenceData) {
        oldData.set(`${y}-${x}`, square.sequenceData);
      }
    });
  });

  // Regenerate grid with new dimensions
  grid.value = Array.from({ length: newRows }, (_, row) =>
    Array.from({ length: newCols }, (_, col) => ({
      id: `${row}-${col}`,
      color: Colors.BLUE,
      sequenceData: oldData.get(`${row}-${col}`) || null,
    }))
  );
});

function copyToSquare(x, y, sequenceData) {
  const targetSquare = grid.value[y][x];
  if (targetSquare) {
    const clone = cloneSequence(sequenceData)
    targetSquare.sequenceData = clone;
    console.log(`Copying sequence to square at (${x}, ${y})`, sequenceData, clone, targetSquare.sequenceData);
  }
}

defineExpose({
  copyToSquare,
  grid,
});
</script>

<template>
  <div class="buffer-container flex-center-full" data-component="buffer">
    <p class="buffer-title">{{ title }}</p>
    <div
      class="buffer-wrapper flex-center-full"
      :data-component="title.toLowerCase().replace(' ', '')"
      :style="{ width: roomContainerWidth + 'px', height: roomContainerHeight + 'px' }"
    >
      <div v-for="(row, rowIndex) in grid" :key="rowIndex" class="room-row" :data-row="rowIndex">
        <div
          v-for="(square, colIndex) in row"
          :key="square.id"
          class="square-cell"
          :data-grid-x="colIndex"
          :data-grid-y="rowIndex"
          :style="{
            width: squareWidth + 'px',
            height: squareHeight + 'px',
            margin: squareMargin + 'px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }"
        >
          <SquareComponent
            :color="square.color"
            :height="squareHeight"
            :width="squareWidth"
            :margin="0"
            :x="colIndex"
            :y="rowIndex"
            :sequence-data="square.sequenceData"
            @copy-sequence="$emit('copy-sequence', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.buffer-container {
  padding-top: 30px;
  padding-bottom: 10px;
  position: relative;
  background-color: var(--component-bg-color);
  width: 150px;
}

.buffer-wrapper,
.buffer-container {
  border: solid 1px var(--border-color);
  border-radius: 10px;
  flex-direction: column;
}

.buffer-title {
  position: absolute;
  top: -9px;
  left: 5px;
  font-size: 13px;
  font-weight: 600;
  padding: 0 6px;
  background-color: var(--component-bg-color);
  color: var(--text-color);
  opacity: 0.7;
}

.room-row {
  display: flex;
}

@media (max-width: 1200px) {
  .buffer-container {
    width: 120px;
  }
}

@media (max-width: 1100px) {
  .buffer-container {
    width: 100px;
  }
}

@media (max-width: 768px) {
  .buffer-wrapper {
    flex-direction: row !important;
  }

  .buffer-container {
    width: auto;
    padding-top: 25px;
    padding-bottom: 10px;
    padding-right: 3px;
    padding-left: 3px;
  }
}
</style>
