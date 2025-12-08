<script setup>
import { computed } from 'vue';

const props = defineProps({
  sequenceData: {
    type: Object,
    required: true,
  },
  width: {
    type: Number,
    default: 60,
  },
  height: {
    type: Number,
    default: 40,
  },
});

// Process sequence data to create chart points
const chartData = computed(() => {
  if (!props.sequenceData?.notes || props.sequenceData.notes.length === 0) {
    return [];
  }

  const notes = props.sequenceData.notes;
  const totalSteps = parseInt(props.sequenceData.totalQuantizedSteps) || 64;

  // Grid constants matching DrawComponent
  const highestMidiNote = 89; // F6 top row
  const totalGridRows = 30; // Number of rows in the grid c4 to f6

  // Create data points for the chart
  const points = notes.map((note) => {
    const startStep = parseInt(note.quantizedStartStep) || 0;
    const endStep = parseInt(note.quantizedEndStep) || startStep + 1;
    const pitch = note.pitch;

    // Calculate the row index in the grid
    const rowIndex = highestMidiNote - pitch;

    // Normalize position based on actual grid position
    const x = startStep / totalSteps;
    // Map row index to y position (0 = top, 1 = bottom)
    // Add small padding on top and bottom
    const y = 0.05 + (rowIndex / (totalGridRows - 1)) * 0.9;
    const duration = endStep - startStep;

    return {
      x,
      y,
      duration,
      startStep,
      endStep,
      pitch,
      rowIndex,
    };
  });

  // Sort by start step for proper line drawing
  return points.sort((a, b) => a.startStep - b.startStep);
});

// Generate SVG path for the melody line
const pathData = computed(() => {
  if (chartData.value.length === 0) return '';

  let path = '';

  chartData.value.forEach((point, index) => {
    const x = point.x * props.width;
    const y = point.y * props.height;

    if (index === 0) {
      path += `M ${x} ${y}`;
    } else {
      // Create smooth curve to next point
      const prevPoint = chartData.value[index - 1];
      const prevX = prevPoint.x * props.width;
      const prevY = prevPoint.y * props.height;

      // Simple bezier curve for smoothness
      const cpX = (prevX + x) / 2;
      path += ` Q ${cpX} ${prevY} ${x} ${y}`;
    }
  });

  return path;
});
</script>

<template>
  <div class="sequence-preview">
    <svg :width="width" :height="height" class="preview-svg" v-if="chartData.length > 0">
      <!-- Background grid -->
      <defs>
        <pattern id="grid" width="10" height="8" patternUnits="userSpaceOnUse">
          <path
            d="M 10 0 L 0 0 0 8"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            stroke-width="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

      <!-- Melody line -->
      <path
        :d="pathData"
        fill="none"
        stroke="rgba(255, 255, 255, 0.9)"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>

    <!-- Fallback for empty sequences -->
    <div v-else class="empty-preview">
      <div class="empty-indicator"></div>
    </div>
  </div>
</template>

<style scoped>
.sequence-preview {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  border-radius: 4px;
  overflow: hidden;
  animation: fadeInPreview 0.6s ease-out;
}

@keyframes fadeInPreview {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

.preview-svg {
  display: block;
  animation: fadeInChart 0.8s ease-out 0.1s both;
}

@keyframes fadeInChart {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

.empty-preview {
  width: 60px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeInEmpty 0.5s ease-out;
}

@keyframes fadeInEmpty {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.empty-indicator {
  width: 8px;
  height: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.7;
  }
}
</style>
