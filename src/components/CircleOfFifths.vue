<script setup>
import { ref, computed, onMounted } from 'vue';
import { useTonicKeyStore } from '@/stores/tonicKey';

const tonicKeyStore = useTonicKeyStore();

// Circle of fifths in order (major keys)
const circleOfFifths = ['C', 'G', 'D', 'A', 'E', 'B', 'F♯/G♭', 'D♭', 'A♭', 'E♭', 'B♭', 'F'];

// Current rotation angle
const rotation = ref(0);
const isDragging = ref(false);
const lastAngle = ref(0);
const isSnapping = ref(false);

// Initialize rotation based on current tonic key
onMounted(() => {
  const currentKey = tonicKeyStore.tonicKey;
  const keyIndex = circleOfFifths.indexOf(currentKey);
  if (keyIndex !== -1) {
    rotation.value = -keyIndex * 30;
  }
});

// Calculate which key is at the top
const selectedKeyIndex = computed(() => {
  // Normalize rotation to 0-360
  const normalizedRotation = ((rotation.value % 360) + 360) % 360;

  // Each key is 30 degrees apart
  const segmentAngle = 30;

  // Calculate which segment is at the top
  return Math.round((360 - normalizedRotation) / segmentAngle) % 12;
});

const selectedKey = computed(() => {
  return circleOfFifths[selectedKeyIndex.value];
});

// Handle mouse/touch start
const startDrag = (event) => {
  isDragging.value = true;
  const angle = getAngle(event);
  lastAngle.value = angle;
};

// Handle mouse/touch move
const onDrag = (event) => {
  if (!isDragging.value) return;

  const angle = getAngle(event);
  const delta = angle - lastAngle.value;

  // Handle angle wrap-around
  let adjustedDelta = delta;
  if (delta > 180) adjustedDelta = delta - 360;
  if (delta < -180) adjustedDelta = delta + 360;

  rotation.value += adjustedDelta;
  lastAngle.value = angle;
};

// Handle mouse/touch end
const stopDrag = () => {
  if (isDragging.value) {
    isDragging.value = false;

    // Enable smooth transition for snapping
    isSnapping.value = true;

    // Snap to nearest key position
    const segmentAngle = 30;
    const normalizedRotation = ((rotation.value % 360) + 360) % 360;

    // Find the nearest key position
    const nearestKeyIndex = Math.round(normalizedRotation / segmentAngle);
    const snappedRotation = nearestKeyIndex * segmentAngle;

    // Calculate the shortest path to snap
    let rotationDiff = snappedRotation - normalizedRotation;
    if (rotationDiff > 180) rotationDiff -= 360;
    if (rotationDiff < -180) rotationDiff += 360;

    // Apply the snap rotation
    rotation.value += rotationDiff;

    // Disable transition after snap completes
    setTimeout(() => {
      isSnapping.value = false;
      // Save the selected key to the store after snap completes
      tonicKeyStore.setTonicKey(selectedKey.value);
    }, 200);
  }
};

// Get angle from center of circle
const getAngle = (event) => {
  const circle = event.currentTarget;
  const rect = circle.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const clientX = event.clientX || (event.touches && event.touches[0]?.clientX);
  const clientY = event.clientY || (event.touches && event.touches[0]?.clientY);

  const deltaX = clientX - centerX;
  const deltaY = clientY - centerY;

  const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
  return angle + 90;
};

// Calculate position for each key
const getKeyPosition = (index) => {
  const angle = (index * 30 - 90) * (Math.PI / 180);
  const radius = 100; // radius in pixels
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  return { x, y };
};
</script>

<template>
  <div class="circle-of-fifths-container">
    <div
      class="circle-wrapper"
      @mousedown="startDrag"
      @mousemove="onDrag"
      @mouseup="stopDrag"
      @mouseleave="stopDrag"
      @touchstart.prevent="startDrag"
      @touchmove.prevent="onDrag"
      @touchend="stopDrag"
      @touchcancel="stopDrag"
    >
      <svg
        class="circle-of-fifths"
        :class="{ snapping: isSnapping }"
        viewBox="-150 -150 300 300"
        :style="{ transform: `rotate(${rotation}deg)` }"
      >
        <!-- Outer circle -->
        <circle cx="0" cy="0" r="120" fill="none" stroke="#666" stroke-width="2" />

        <!-- Inner circle -->
        <circle cx="0" cy="0" r="80" fill="none" stroke="#666" stroke-width="2" />

        <!-- Keys -->
        <g v-for="(key, index) in circleOfFifths" :key="key">
          <!-- Segment lines -->
          <line
            :x1="getKeyPosition(index).x * 0.67"
            :y1="getKeyPosition(index).y * 0.67"
            :x2="getKeyPosition(index).x * 1.2"
            :y2="getKeyPosition(index).y * 1.2"
            stroke="#666"
            stroke-width="1"
          />

          <!-- Key labels -->
          <text
            :x="getKeyPosition(index).x"
            :y="getKeyPosition(index).y"
            text-anchor="middle"
            dominant-baseline="middle"
            class="key-label"
            :class="{ active: index === selectedKeyIndex }"
            fill="white"
            font-size="14"
            font-weight="bold"
            :transform="`rotate(${-rotation} ${getKeyPosition(index).x} ${getKeyPosition(index).y})`"
          >
            {{ key }}
          </text>
        </g>

        <!-- Center dot -->
        <circle cx="0" cy="0" r="5" fill="#e0d758" />
      </svg>

      <!-- Top marker shows which key is selected -->
      <div class="top-marker">▼</div>
    </div>

    <p class="instruction">Drag to spin the circle. The note at the top is your root note.</p>
  </div>
</template>

<style scoped>
.circle-of-fifths-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  user-select: none;
  margin-top: 20px;
}

.circle-wrapper {
  position: relative;
  width: 300px;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

.circle-wrapper:active {
  cursor: grabbing;
}

.circle-of-fifths {
  width: 100%;
  height: 100%;
}

.circle-of-fifths.snapping {
  transition: transform 0.2s ease-out;
}

.key-label {
  pointer-events: none;
  transition: fill 0.3s;
}

.key-label.active {
  fill: #e0d758;
  font-size: 16px;
}

.top-marker {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 24px;
  color: #e0d758;
  pointer-events: none;
  text-shadow: 0 0 5px rgba(76, 175, 80, 0.5);
}

.instruction {
  margin-top: 20px;
  text-align: center;
  color: white;
  font-size: 14px;
  font-style: italic;
}
</style>
