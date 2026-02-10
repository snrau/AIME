<script setup>
import SquareComponent from './SquareComponent.vue';
import { onMounted, watch, onUnmounted, ref, computed, nextTick } from 'vue';
import { useGrid } from '@/composables/useGrid';
import { useFormations } from '@/composables/useFormations';
import { usePullSquare } from '@/composables/usePullSquare';
import { useResponsiveGrid } from '@/utils/gridUtils';
import { MagentaService } from '@/services/magentaService';
import { MagentaWorkerClient } from '@/services/MagentaWorkerClient';
import { useFirstSquareLogic } from '@/composables/useFirstSquareLogic';
import { useGridHistoryStore } from '@/stores/gridHistory';
import * as mm from '@magenta/music';
import { useModeStore } from '../stores/mode.js';
import { useMidiPlayer } from '../stores/midioutput.js'
import { toRaw } from 'vue';
import { cloneGrid, clonePlain, cloneSequence, cloneHistory } from '@/utils/cloneUtils';

// Use responsive grid configuration
const {
  rows,
  cols,
  squareHeight,
  squareWidth,
  squareMargin,
  roomContainerHeight,
  roomContainerWidth,
} = useResponsiveGrid();

const magentaService = new MagentaService();
const gridHistoryStore = useGridHistoryStore();

// Flag to prevent saving states during undo/redo operations
const isRestoringState = ref(false);

// Flag to prevent saving states during atomic operations like interpolation
const isBatchOperation = ref(false);

// Flag to prevent debounced saves immediately after batch completion
const justCompletedBatch = ref(false);

const modeStore = useModeStore();

const outputname = useMidiPlayer();

// reactive state for pull highlighting
const pullDirection = ref(null);
const pullPosition = ref(null);
const pullTarget = ref(null);

// Local loading state for immediate feedback
const localFormationLoading = ref(false);
const isPullLoading = ref(false);

const emit = defineEmits(['copy-sequence']);

// Initialize composables
const {
  grid,
  getSquareAtPosition,
  placeSquare,
  initializeGrid,
  clearGrid,
  updateSquare,
  removeSquare,
  removeSquares,
} = useGrid(rows.value, cols.value);
const { squareFormations, handleFormationButtonClick, isFormationLoading } = useFormations(
  grid,
  getSquareAtPosition,
  magentaService,
  placeSquare,
  clearGrid,
  rows.value,
  cols.value,
  isBatchOperation
);
const { handleFirstSquareSequenceGenerated } = useFirstSquareLogic(
  placeSquare,
  grid,
  magentaService,
  updateSquare
);
const { handlePullSquare } = usePullSquare(
  getSquareAtPosition,
  removeSquares,
  cols.value,
  rows.value,
  placeSquare,
  magentaService,
  updateSquare,
  isBatchOperation
);

// Computed property to get highlighted cell positions
const highlightedCells = computed(() => {
  if (!pullDirection.value || !pullPosition.value || !pullTarget.value) return new Set();
  const { x, y } = pullPosition.value;
  const targetx = pullTarget.value.x;
  const targety = pullTarget.value.y;
  const dist = pullDirection.value === 'right' || pullDirection.value === 'left' ? Math.abs(x - targetx):Math.abs(y - targety)
  const fullrange = (pullDirection.value === 'right' || pullDirection.value === 'left') && (targetx === 0 || targetx === cols.value-1) || (pullDirection.value === 'up' || pullDirection.value === 'down') && (targety === 0 || targety === rows.value-1)
  const interpolate = checkIfInterpolate({x:x,y:y,direction:pullDirection.value})
  const cells = new Set();
  if(!interpolate){
    cells.add(`${targety}-${targetx}`);
    return cells
  }
  if (fullrange && (pullDirection.value === 'right' || pullDirection.value === 'left')){
    for (let col = 0; col < cols.value; col++) {
      cells.add(`${y}-${col}`);
    }
  } else if (fullrange && (pullDirection.value === 'up' || pullDirection.value === 'down')){
    for (let row = 0; row < rows.value; row++) {
      cells.add(`${row}-${x}`);
    }
  }else if (pullDirection.value === 'right') {
    for (let col = x-dist; col < x; col++) {
      cells.add(`${y}-${col}`);
    }
  } else if (pullDirection.value === 'left') {
    for (let col = x + 1; col < x+1+dist; col++) {
      cells.add(`${y}-${col}`);
    }
  } else if (pullDirection.value === 'down') {
    for (let row = y-dist; row < y; row++) {
      cells.add(`${row}-${x}`);
    }
  } else if (pullDirection.value === 'up') {
    for (let row = y + 1; row < y+1+dist; row++) {
      cells.add(`${row}-${x}`);
    }
  }
  return cells;
});



// Wrapper for handlePullSquare to set highlighting
const handlePullSquareWithHighlight = async (eventData) => {
  pullDirection.value = eventData.direction;
  pullPosition.value = { x: eventData.x, y: eventData.y };

  // Check if there's a target square to determine if interpolation will happen
  let targetSquare = null;
  let hasSpaceForPull = true;

  const { x, y, direction } = eventData;

  switch (direction) {
    case 'left':
      targetSquare = getSquareAtPosition(x - 1, y);
      if (getSquareAtPosition(x + 1, y)) hasSpaceForPull = false;
      break;
    case 'right':
      targetSquare = getSquareAtPosition(x + 1, y);
      if (getSquareAtPosition(x - 1, y)) hasSpaceForPull = false;
      break;
    case 'up':
      targetSquare = getSquareAtPosition(x, y - 1);
      if (getSquareAtPosition(x, y + 1)) hasSpaceForPull = false;
      break;
    case 'down':
      targetSquare = getSquareAtPosition(x, y + 1);
      if (getSquareAtPosition(x, y - 1)) hasSpaceForPull = false;
      break;
  }

  // Only show loading if there's actually going to be interpolation
  const willInterpolate = targetSquare && hasSpaceForPull;

  if (willInterpolate) {
    isPullLoading.value = true;

    // Use requestAnimationFrame to ensure the UI updates before executing
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  }

  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  // Always save the current state before batch operation
  const gridSnapshot = cloneGrid(grid.value);//JSON.parse(JSON.stringify(grid.value));
  gridHistoryStore.saveState(gridSnapshot);

  isBatchOperation.value = true;

  try {
    await handlePullSquare(eventData);
  } finally {
    isPullLoading.value = false;
  }
};

const handlePullPreview = (eventData) => {
  pullDirection.value = eventData.direction;
  pullPosition.value = { x: eventData.x, y: eventData.y };
  pullTarget.value = eventData.target
};

const handlePullEnd = () => {
  pullDirection.value = null;
  pullPosition.value = null;
  pullTarget.value = null
};

// Wrapper for handleFormationButtonClick to manage batch operations
const handleFormationButtonClickWithBatch = async (formation) => {
  console.log('=== FORMATION BUTTON CLICKED ===');
  console.log('Current history length:', gridHistoryStore.history.length);
  console.log('Current step:', gridHistoryStore.currentStep);

  localFormationLoading.value = true;

  await new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });

  if (saveTimeout) {
    console.log('Clearing pending save timeout');
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  // Always save the current state before batch operation
  const gridSnapshot = cloneGrid(grid.value); //JSON.parse(JSON.stringify(grid.value));
  console.log('Saving BEFORE state - grid has', gridSnapshot.length, 'squares');
  gridHistoryStore.saveState(gridSnapshot);
  console.log(
    'After BEFORE save - history length:',
    gridHistoryStore.history.length,
    'step:',
    gridHistoryStore.currentStep
  );

  // Wait for any pending reactive updates to complete
  await nextTick();

  console.log('Setting batch operation flag to TRUE');
  isBatchOperation.value = true;

  try {
    await handleFormationButtonClick(formation);
    console.log('Formation handler completed');
  } finally {
    // Clear local loading state when done
    localFormationLoading.value = false;
  }
};

onMounted(async () => {
  // Place one square in the middle after grid initialization
  initializeGrid();

  // Initialize the MusicVAE model
  //await magentaService.initializeModel();
  //console.log('MusicVAE model initialized and ready');

  // Set flag to prevent initial state from triggering a save
  isRestoringState.value = true;

  // Initialize history with initial grid state
  gridHistoryStore.initializeHistory([...grid.value]);

  // Reset flag after initialization
  setTimeout(() => {
    isRestoringState.value = false;
  }, 100);

  // Add keyboard event listeners for undo/redo
  window.addEventListener('keydown', handleKeyDown);
});

// Clean up event listeners when component is unmounted
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);

  // Clear any pending save operations
  if (saveTimeout) clearTimeout(saveTimeout);

  // Ensure isRestoringState timers are cleared
  isRestoringState.value = false;
});

// Handle keyboard shortcuts
function handleKeyDown(event) {
  // Check for Cmd+Z (Mac) or Ctrl+Z (Windows/Linux) for Undo
  if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey) {
    event.preventDefault();
    if (gridHistoryStore.canUndo) {
      handleUndo();
    }
  }

  // Check for Cmd+Shift+Z (Mac) or Ctrl+Y (Windows/Linux) for Redo
  if (
    ((event.metaKey || event.ctrlKey) && event.key === 'z' && event.shiftKey) ||
    ((event.metaKey || event.ctrlKey) && event.key === 'y')
  ) {
    event.preventDefault();
    if (gridHistoryStore.canRedo) {
      handleRedo();
    }
  }
}

// Watch for grid changes to save state
let saveTimeout = null;
watch(
  () => grid.value,
  (newGrid) => {
    // Skip saving state if in the middle of restoring from history
    if (isRestoringState.value) {
      console.log('SKIPPED save: restoring state');
      return;
    }

    // Skip saving state if in the middle of a batch operation (like interpolation)
    if (isBatchOperation.value) {
      console.log('SKIPPED save: batch operation in progress');
      return;
    }

    // Skip saving state if we just completed a batch operation
    if (justCompletedBatch.value) {
      console.log('SKIPPED save: just completed batch operation');
      return;
    }

    // Clear any existing timeout to debounce updates
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    // Debounce save operation to improve efficiency
    saveTimeout = setTimeout(() => {
      // deep clone
      const gridSnapshot = newGrid.map(item => {
        const { ref, ...rest } = toRaw(item);
        return rest;
      });//JSON.parse(JSON.stringify(toRaw(newGrid)));
      console.log('DEBOUNCED SAVE from grid watcher - grid has', gridSnapshot.length, 'squares');
      gridHistoryStore.saveState(gridSnapshot);
      console.log(
        'After save - history length:',
        gridHistoryStore.history.length,
        'step:',
        gridHistoryStore.currentStep
      );
      saveTimeout = null;
    }, 300);
  },
  { deep: true } // deep watching to detect changes in nested node sequences
);

// Watch for batch operation completion to save final state
watch(isBatchOperation, (newValue, oldValue) => {
  console.log('=== BATCH OPERATION FLAG CHANGED ===', { oldValue, newValue });
  // When batch operation ends (transitions from true to false)
  if (oldValue === true && newValue === false) {
    // Clear any pending debounced saves from the grid watcher
    if (saveTimeout) {
      console.log('Clearing pending save timeout in batch completion');
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }

    // Set flag to prevent immediate debounced saves after batch
    justCompletedBatch.value = true;

    // Wait a tick for all grid updates to complete, then save
    setTimeout(() => {
      const gridSnapshot = cloneGrid(grid.value); //JSON.parse(JSON.stringify(grid.value));
      console.log('BATCH COMPLETION SAVE - grid has', gridSnapshot.length, 'squares');
      gridHistoryStore.saveState(gridSnapshot);
      console.log(
        'After BATCH save - history length:',
        gridHistoryStore.history.length,
        'step:',
        gridHistoryStore.currentStep
      );

      // Reset the flag after a delay to allow normal saves to resume
      setTimeout(() => {
        justCompletedBatch.value = false;
        console.log('Batch completion flag reset - normal saves can resume');
      }, 500);
    }, 100);
  }
});

// Undo function restore previous grid state
function handleUndo() {
  console.log('=== UNDO CALLED ===');
  console.log(
    'Before undo - history length:',
    gridHistoryStore.history.length,
    'step:',
    gridHistoryStore.currentStep
  );

  // Cancel any pending saves
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  // Set flag to prevent watch from saving during restoration
  isRestoringState.value = true;

  const previousGrid = gridHistoryStore.undo();
  if (previousGrid) {
    console.log('Restoring grid with', previousGrid.length, 'squares');
    console.log(
      'After undo - history length:',
      gridHistoryStore.history.length,
      'step:',
      gridHistoryStore.currentStep
    );

    // Clear current grid and restore from history
    clearGrid();
    previousGrid.forEach((square) => {
      placeSquare(square.x, square.y, square.sequenceData, square.isLoading);
    });
  }

  // Reset flag after a short delay to ensure all reactive updates complete
  setTimeout(() => {
    isRestoringState.value = false;
  }, 100);
}

// Redo function go forward in history
function handleRedo() {
  // Cancel any pending saves
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  // Set flag to prevent watch from saving during restoration
  isRestoringState.value = true;

  const nextGrid = gridHistoryStore.redo();
  if (nextGrid) {
    // Clear current grid and restore from history
    clearGrid();
    nextGrid.forEach((square) => {
      placeSquare(square.x, square.y, square.sequenceData, square.isLoading);
    });
  }

  // Reset flag after a short delay to ensure all reactive updates complete
  setTimeout(() => {
    isRestoringState.value = false;
  }, 100);
}

function copyToSquare(x, y, sequenceData) {
  const targetSquare = getSquareAtPosition(x, y);
  if (targetSquare) {
    updateSquare(
      x,
      y,
      cloneSequence(sequenceData)
    );
  }
}

function checkIfInterpolate(eventData){
  let targetSquare = null
  let hasSpaceForPull = true;
  const {x,y,direction} = eventData

  switch (direction) {
    case 'left':
      targetSquare = getSquareAtPosition(x - 1, y);
      if (getSquareAtPosition(x + 1, y)) hasSpaceForPull = false;
      break;
    case 'right':
      targetSquare = getSquareAtPosition(x + 1, y);
      if (getSquareAtPosition(x - 1, y)) hasSpaceForPull = false;
      break;
    case 'up':
      targetSquare = getSquareAtPosition(x, y - 1);
      if (getSquareAtPosition(x, y + 1)) hasSpaceForPull = false;
      break;
    case 'down':
      targetSquare = getSquareAtPosition(x, y + 1);
      if (getSquareAtPosition(x, y - 1)) hasSpaceForPull = false;
      break;
  }

  // Only show loading if there's actually going to be interpolation
  return targetSquare && hasSpaceForPull;
}

function handleSequenceUpdated(eventData) {
  const { x, y, sequenceData } = eventData;
  updateSquare(x, y, sequenceData);
}

function handleGridCellClick(x, y) {
  if (modeStore.isCreateMode && !getSquareAtPosition(x, y)) {
    placeSquare(x, y);
  }
}

function handleRemoveSquare(eventData) {
  const { x, y, target } = eventData;
  console.log(target);
  if (target === 'grid') removeSquare(x, y);
}

// Get grid data including history for saving
function getGridData() {
  const historyValue = gridHistoryStore.history?.value || gridHistoryStore.history || [[]];
  const currentStepValue = gridHistoryStore.currentStep?.value ?? gridHistoryStore.currentStep ?? 0;

  return {
    history: clonePlain(historyValue),
    currentStep: currentStepValue,
  };
}

// Load grid data from a saved room
function loadGridData(gridData) {
  // Stop any playing sequences when switching rooms
  /*
  try {
    if (player && player.isPlaying()) {
      player.stop();
    }
  } catch (error) {
    console.warn('Error stopping player during room switch:', error);
  }
    */

  // Cancel any pending saves
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  // Set flag to prevent watch from saving during restoration
  isRestoringState.value = true;

  // Restore the history
  if (gridData.history && gridData.currentStep !== undefined) {
    gridHistoryStore.history = cloneHistory(gridData.history);
    gridHistoryStore.currentStep = gridData.currentStep;

    // Get the current grid state from history
    const currentGridState = gridHistoryStore.currentGrid;

    // Clear and restore the grid
    clearGrid();
    currentGridState.forEach((square) => {
      placeSquare(square.x, square.y, square.sequenceData, square.isLoading);
    });
  }

  // Reset flag after a short delay
  setTimeout(() => {
    isRestoringState.value = false;
  }, 100);
}

defineExpose({
  copyToSquare,
  playSelectedSquares,
  handleUndo,
  handleRedo,
  getGridData,
  loadGridData,
  get canUndo() {
    return gridHistoryStore.canUndo;
  },
  get canRedo() {
    return gridHistoryStore.canRedo;
  },
});

const canvasRef = ref(null);
const ctx = ref(null);
const isDrawing = ref(false);
const lines = ref([]);
const selectedSquares = ref([]);

const showAddToMelodyPopup = ref(false);

function getMousePos(event) {
  const rect = canvasRef.value.getBoundingClientRect();
  // Handle both mouse and touch events
  const clientX = event.clientX ?? event.touches?.[0]?.clientX ?? 0;
  const clientY = event.clientY ?? event.touches?.[0]?.clientY ?? 0;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function handleMouseDown(event) {
  if (!modeStore.isFeatureMode) return;

  // Prevent default touch behavior to avoid scrolling
  if (event.type === 'touchstart') {
    event.preventDefault();
  }

  lines.value = [];
  selectedSquares.value = [];
  ctx.value?.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);

  isDrawing.value = true;
  const pos = getMousePos(event);
  lines.value.push([{ x: pos.x, y: pos.y }]);
}

function drawLines() {
  if (!ctx.value) return;
  ctx.value.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);

  ctx.value.strokeStyle = 'red';
  ctx.value.lineWidth = 6;
  ctx.value.lineCap = 'round';
  ctx.value.lineJoin = 'round';

  lines.value.forEach((line) => {
    if (line.length < 2) return;
    ctx.value.beginPath();
    ctx.value.moveTo(line[0].x, line[0].y);
    for (let i = 1; i < line.length; i++) {
      ctx.value.lineTo(line[i].x, line[i].y);
    }
    ctx.value.stroke();
  });
}

onMounted(() => {
  const canvas = canvasRef.value;
  if (canvas) {
    ctx.value = canvas.getContext('2d');
  }
});

onUnmounted(() => {
  ctx.value = null;
});

function getSquareFromPoint(x, y) {
  const w = Number(squareWidth?.value ?? squareWidth);
  const h = Number(squareHeight?.value ?? squareHeight);
  const m = Number(squareMargin?.value ?? squareMargin);
  const r = Number(rows?.value ?? rows);
  const c = Number(cols?.value ?? cols);

  const cellWidth = w + 2 * m;
  const cellHeight = h + 2 * m;

  const col = Math.floor(x / cellWidth);
  const row = Math.floor(y / cellHeight);

  if (row >= 0 && row < r && col >= 0 && col < c) {
    return { row, col };
  }
  return null;
}

function handleMouseMove(event) {
  if (!isDrawing.value || !modeStore.isFeatureMode) return;

  // Prevent default touch behavior
  if (event.type === 'touchmove') {
    event.preventDefault();
  }

  const pos = getMousePos(event);

  const currentLine = lines.value[lines.value.length - 1];
  currentLine.push({ x: pos.x, y: pos.y });

  const square = getSquareFromPoint(pos.x, pos.y);
  if (square) {
    const id = `${square.row}-${square.col}`;
    const lastId = selectedSquares.value[selectedSquares.value.length - 1];
    if (id !== lastId) {
      selectedSquares.value.push(id);
    }
  }

  drawLines();
}

function handleMouseUp(event) {
  if (!modeStore.isFeatureMode) return;

  // Prevent default touch behavior
  if (event.type === 'touchend') {
    event.preventDefault();
  }

  isDrawing.value = false;

  if (selectedSquares.value.length > 0) {
    confirmAddToMelody();
    //showAddToMelodyPopup.value = true;
  }
}

function confirmAddToMelody() {
  //showAddToMelodyPopup.value = false;

  const validSquares = selectedSquares.value
    .map((id) => {
      const [row, col] = id.split('-').map(Number);
      return { row, col, square: getSquareAtPosition(col, row) };
    })
    .filter((s) => s.square?.sequenceData);

  if (validSquares.length === 0) {
    cleanupCanvas();
    return;
  }

  // add Sqaures to Melody one by one
  validSquares.forEach((s, idx) => {
    emit('copy-sequence', {
      x: idx,
      y: 0,
      sequenceData: s.square.sequenceData,
      target: 'melody',
    });
  });

  cleanupCanvas();
}

function cancelAddToMelody() {
  showAddToMelodyPopup.value = false;
  cleanupCanvas();
}

function cleanupCanvas() {
  selectedSquares.value = [];
  if (ctx.value && canvasRef.value) {
    ctx.value.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
  }
}

async function playSelectedSquares() {
  const seq = [];
  let currentOffset = 0;

  const sortedSquares = selectedSquares.value;

  for (const id of sortedSquares) {
    const [row, col] = id.split('-').map(Number);
    const square = getSquareAtPosition(col, row);

    if (square?.sequenceData?.notes?.length) {
      const notes = square.sequenceData.notes.map((note) => {
        // check if notes are valid
        const start = Math.max(0, note.quantizedStartStep);
        const end = Math.max(start + 1, note.quantizedEndStep);

        return {
          pitch: note.pitch,
          quantizedStartStep: start + currentOffset,
          quantizedEndStep: end + currentOffset,
        };
      });

      seq.push(...notes);

      currentOffset += 64 + 1; // 1 step break between sqaures
    }
  }

  if (!seq.length) {
    console.warn('No Sequence found');
    return;
  }

  const totalSteps = Math.max(...seq.map((n) => n.quantizedEndStep));

  const fullSeq = {
    notes: seq,
    quantizationInfo: { stepsPerQuarter: 4 },
    totalQuantizedSteps: totalSteps,
    tempos: [{ qpm: 120 }],
  };

  const p = await initPlayer();
  p.stop();
  p.start(fullSeq);

  // stop after last note played (optional for testing)
  const durationMs = (totalSteps / 4) * (60000 / 120);
  setTimeout(() => p.stop(), durationMs + 100);
}

let player = null;
async function initPlayer() {
  if (player && player.outputs[0].name === outputname.output) return player;


  if(outputname.output === "default"){
    player = new mm.Player();
    console.log('Using Magenta Audio Player.', player);
    player.outputs = [{name:'default'}]
    return player;
  }
  // Check WebMIDI support
  if (navigator.requestMIDIAccess) {
    try {
      const midiAccess = await navigator.requestMIDIAccess();
      const outputs = Array.from(midiAccess.outputs.values());

      // If MIDI output possible use it
      if (outputs.length > 0) {
        const output = outputs.find(o => o.name === outputname.output);
        // If a valid MIDI output is found, use it
        if (output) {
          const midiPlayer = new mm.MIDIPlayer();
          midiPlayer.outputs = [output];
          player = midiPlayer;

          console.log('Using MIDI output:', output.name);
        } else {
          console.warn('Specified MIDI output not found: using AudioPlayer instead.');
          player = new mm.Player(); // Fallback to AudioPlayer
        }
        return player;
      } else {
        console.warn('No MIDI outputs found: using AudioPlayer instead.');
      }
    } catch (err) {
      console.error('Failed to access MIDI: using AudioPlayer instead.', err);
    }
  } else {
    console.warn('WebMIDI not supported: using AudioPlayer instead.');
  }

  // Fallback if no MIDI output available
  player = new mm.Player();
  console.log('Using Magenta Audio Player.');

  return player;
}
</script>

<template>
  <div
    class="room-container flex-center-full"
    :style="{ width: roomContainerWidth + 'px', height: roomContainerHeight + 'px' }"
  >
    <div class="grid-container" data-component="room">
      <!-- Canvas for drawing the line over the grid -->
      <canvas
        ref="canvasRef"
        class="drawing-canvas"
        :width="roomContainerWidth"
        :height="roomContainerHeight"
        :style="{ pointerEvents: modeStore.isFeatureMode ? 'auto' : 'none' }"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
        @touchstart="handleMouseDown"
        @touchmove="handleMouseMove"
        @touchend="handleMouseUp"
        @touchcancel="handleMouseUp"
      ></canvas>

      <!-- Popup -->
      <div v-if="showAddToMelodyPopup" class="popup-overlay">
        <div class="popup-content">
          <p>Möchtest du die gezeichneten Squares zur Melody hinzufügen?</p>
          <div class="popup-buttons">
            <button @click="confirmAddToMelody">Ja</button>
            <button @click="cancelAddToMelody">Nein</button>
          </div>
        </div>
      </div>

      <!-- Pull Loading Overlay -->
      <div v-if="isPullLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
      </div>

      <!-- Create a visual grid structure -->
      <div v-for="row in rows" :key="'row-' + row" class="grid-row">
        <div
          v-for="col in cols"
          :key="'cell-' + row + '-' + col"
          class="grid-cell"
          :class="{ highlighted: highlightedCells.has(`${row - 1}-${col - 1}`) }"
          :data-grid-x="col - 1"
          :data-grid-y="row - 1"
          :style="{
            width: squareWidth + 'px',
            height: squareHeight + 'px',
            margin: squareMargin + 'px',
            cursor:
              modeStore.isCreateMode && !getSquareAtPosition(col - 1, row - 1)
                ? 'crosshair'
                : 'default',
          }"
          @click="handleGridCellClick(col - 1, row - 1)"
          @touchstart.prevent="handleGridCellClick(col - 1, row - 1)"
        >
          <SquareComponent
            v-if="getSquareAtPosition(col - 1, row - 1)"
            :ref="
              (el) => {
                if (getSquareAtPosition(col - 1, row - 1))
                  getSquareAtPosition(col - 1, row - 1).ref = el;
              }
            "
            :color="getSquareAtPosition(col - 1, row - 1).color"
            :height="squareHeight"
            :width="squareWidth"
            :margin="0"
            :sequence-data="getSquareAtPosition(col - 1, row - 1).sequenceData"
            :firstSquare="getSquareAtPosition(col - 1, row - 1).firstSquare"
            :x="col - 1"
            :y="row - 1"
            :is-loading="getSquareAtPosition(col - 1, row - 1).isLoading"
            @first-square-sequence-generated="handleFirstSquareSequenceGenerated"
            @pull-square="handlePullSquareWithHighlight"
            @pull-preview="handlePullPreview"
            @pull-end="handlePullEnd"
            @copy-sequence="$emit('copy-sequence', $event)"
            @sequence-updated="handleSequenceUpdated"
            @remove-square="handleRemoveSquare"
          />
        </div>
      </div>

      <!-- Formation Buttons -->
      <div
        v-for="(formation, index) in squareFormations"
        :key="'formation-' + index"
        class="formation-button-container"
        :style="{
          left: formation.x * (squareWidth + 2 * squareMargin) + squareWidth / 2 + 'px',
          top: formation.y * (squareHeight + 2 * squareMargin) + squareHeight / 2 + 'px',
          pointerEvents: modeStore.isFeatureMode ? 'none' : 'auto',
        }"
      >
        <button
          class="formation-button"
          @click="handleFormationButtonClickWithBatch(formation)"
          @touchstart.prevent="handleFormationButtonClickWithBatch(formation)"
          :class="{ loading: localFormationLoading || isFormationLoading }"
        >
          <div v-if="localFormationLoading || isFormationLoading" class="button-spinner"></div>
          <span v-else>+</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.room-container {
  border: solid 1px var(--border-color);
  border-radius: 10px;
  padding: 4px;
  background-color: var(--component-bg-color);
}

.grid-container {
  display: flex;
  flex-direction: column;
  position: relative;
}

.grid-row {
  display: flex;
}

.grid-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  touch-action: none;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
}

.formation-button-container {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 15;
  pointer-events: auto;
}

.formation-button {
  width: 25px;
  height: 25px;
  border-radius: 50%;
  background-color: #5555ff;
  color: white;
  font-weight: bold;
  font-size: 18px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: all 0.1s ease-out;
  touch-action: manipulation;
  -webkit-tap-highlight-color: rgba(85, 85, 255, 0.3);
  user-select: none;
}

.formation-button:hover {
  background-color: #7777ff;
  transform: scale(1.15);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.formation-button:active {
  background-color: #7777ff;
  transform: scale(1.15);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.formation-button.loading {
  background-color: #7777ff;
  cursor: not-allowed;
  transform: scale(1.15);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.button-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-left: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.grid-cell.highlighted {
  background-color: rgba(144, 238, 144, 0.3);
  border: 2px solid rgb(34, 139, 34);
}

.drawing-canvas {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 5;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}

.formation-button-container {
  z-index: 15;
  pointer-events: auto;
}

.popup-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.popup-content {
  background: white;
  padding: 20px 30px;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  text-align: center;
}

.popup-buttons {
  display: flex;
  justify-content: center;
  margin-top: 10px;
  gap: 10px;
}

.popup-buttons button {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.popup-buttons button:first-child {
  background-color: #28a745;
  color: white;
}

.popup-buttons button:last-child {
  background-color: #dc3545;
  color: white;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(255, 255, 255, 0.3);
  border-top: 5px solid white;
  border-radius: 50%;
  animation: spin-loading 0.8s linear infinite;
}

@keyframes spin-loading {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
