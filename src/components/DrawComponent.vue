<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as mm from '@magenta/music';
import { useMidiPlayer } from '../stores/midioutput.js';

// Piano Roll layout
const numSteps = 64;
// C4 (60) to F6 (89) inclusive: 89 - 60 + 1 = 30 pitches
const numPitches = 30;

// Highest MIDI note for the grid (F6)
const highestMidiNote = 77;

const outputname = useMidiPlayer();

const props = defineProps({
  sequenceData: {
    type: Object,
    default: null,
  },
});

const isMouseDown = ref(false);
const drawMode = ref(true);
const isTouchDevice = ref(false);
const currentDragGroupId = ref(null);
const activeButton = ref(null);
const loadingButton = ref(null);
const fileInput = ref(null);

// Trigger the hidden file input
const triggerFileInput = () => {
  fileInput.value.click();
};

const emit = defineEmits(['close', 'sequence-generated']);

let player = null;

// Grid stores objects: { active: boolean, groupId: number|null }
// groupId links cells that should be one continuous note
let nextGroupId = 1;

const grid = ref(
  Array.from({ length: numPitches }, () =>
    Array.from({ length: numSteps }, () => ({ active: false, groupId: null }))
  )
);

// Initialize grid from MIDI data if provided
onMounted(() => {
  if (props.sequenceData) {
    initializeGridFromSequence(props.sequenceData);
  }
});

// Cleanup player when component unmounts
onUnmounted(() => {
  try {
    if (player && player.isPlaying()) {
      player.stop();
    }
  } catch (error) {
    console.warn('Error stopping player during cleanup:', error);
  }
});

// check if work and how to get melody to the store
async function processMidiFile(midiData) {
  // Parse the MIDI file
  const sequence = mm.midiToSequenceProto(midiData);
  sequence.tempos = [{ qpm: 120 }];

  const stepsPerQuarter = 4; // 16th notes
  const quantizedSequence = mm.sequences.quantizeNoteSequence(sequence, stepsPerQuarter);

  // Clear the grid
  grid.value = grid.value.map((row) => row.map(() => ({ active: false, groupId: null })));

  // Iterate through the notes and map them to the grid
  let groupId = nextGroupId;
  quantizedSequence.notes.forEach((note) => {
    const stepIdx = note.quantizedStartStep; // Quantized step index
    const pitchIdx = highestMidiNote - note.pitch; // Map pitch to grid row

    if (stepIdx < 64 && pitchIdx >= 0 && pitchIdx < grid.value.length) {
      for (let i = 0; i < note.quantizedEndStep - note.quantizedStartStep; i++) {
        if (stepIdx + i < numSteps) {
          grid.value[pitchIdx][stepIdx + i] = { active: true, groupId };
        }
      }
    }
    nextGroupId++;
    groupId = nextGroupId;
  });
}

async function importMidiFile(event) {
  const file = event.target.files[0];
  if (file) {
    const midiData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });

    await processMidiFile(midiData);
  }
}

function initializeGridFromSequence(sequence) {
  try {
    // Reset grid first
    grid.value = Array.from({ length: numPitches }, () =>
      Array.from({ length: numSteps }, () => ({ active: false, groupId: null }))
    );

    // Process notes from the sequence
    if (sequence && sequence.notes) {
      sequence.notes.forEach((note) => {
        const pitchIdx = highestMidiNote - note.pitch;
        const startStep = Number(note.quantizedStartStep ?? 0);
        const endStep = Number(note.quantizedEndStep ?? startStep + 1);
        const groupId = nextGroupId++;

        for (let stepIdx = startStep; stepIdx < endStep; stepIdx++) {
          if (pitchIdx >= 0 && pitchIdx < numPitches && stepIdx >= 0 && stepIdx < numSteps) {
            grid.value[pitchIdx][stepIdx] = { active: true, groupId };
          }
        }
      });
    }
  } catch (error) {
    console.error('Error initializing grid from sequence data:', error);
  }
}

const pitchNames = [
  { name: 'C', isBlack: false },
  { name: 'C#', isBlack: true },
  { name: 'D', isBlack: false },
  { name: 'D#', isBlack: true },
  { name: 'E', isBlack: false },
  { name: 'F', isBlack: false },
  { name: 'F#', isBlack: true },
  { name: 'G', isBlack: false },
  { name: 'G#', isBlack: true },
  { name: 'A', isBlack: false },
  { name: 'A#', isBlack: true },
  { name: 'B', isBlack: false },
];

// Build pitches from highestMidiNote (F6, 89) down to C4 (60)
const pitches = Array.from({ length: numPitches }, (_, i) => {
  const midi = highestMidiNote - i;
  const octave = Math.floor(midi / 12) - 1;
  const nameIdx = ((midi % 12) + 12) % 12;
  const base = pitchNames[nameIdx];
  return {
    name: base.name + octave,
    isBlack: base.isBlack,
    midi,
  };
});

async function initPlayer() {
  if (player && player.outputs[0].name === outputname.output) return player;

  if (outputname.output === 'default') {
    player = new mm.Player();
    console.log('Using Magenta Audio Player.', player);
    player.outputs = [{ name: 'default' }];
    return player;
  }

  // Check WebMIDI support
  if (navigator.requestMIDIAccess) {
    try {
      const midiAccess = await navigator.requestMIDIAccess();
      const outputs = Array.from(midiAccess.outputs.values());

      // find the output in array where name is equal to outputname.output
      //use that for player

      // If MIDI output possible use it
      if (outputs.length > 0) {
        const output = outputs.find((o) => o.name === outputname.output);
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

async function playIndividualNote(midiNote) {
  try {
    await initPlayer();

    // Create a simple single-note sequence
    const noteSequence = {
      notes: [
        {
          pitch: midiNote,
          startTime: 0,
          endTime: 0.5,
          velocity: 90,
          program: 0,
        },
      ],
      totalTime: 0.5,
      tempos: [{ time: 0, qpm: 120 }],
    };

    // Stop any currently playing sequence
    if (player.isPlaying()) {
      player.stop();
    }

    // Play the single note
    player.start(noteSequence);
  } catch (error) {
    console.warn('Could not play individual note:', error);
  }
}

async function onMouseDown(pitchIdx, stepIdx) {
  isMouseDown.value = true;
  const cell = grid.value[pitchIdx][stepIdx];
  drawMode.value = !cell.active;

  if (drawMode.value) {
    // Activating: create new group for this pitch row
    const groupId = nextGroupId++;
    currentDragGroupId.value = groupId;
    grid.value[pitchIdx][stepIdx] = { active: true, groupId };

    const midiNote = highestMidiNote - pitchIdx;
    await playIndividualNote(midiNote);
  } else {
    // Deactivating
    currentDragGroupId.value = null;
    grid.value[pitchIdx][stepIdx] = { active: false, groupId: null };
  }

  window.addEventListener('mouseup', onMouseUp);
}

async function onMouseEnter(pitchIdx, stepIdx) {
  if (isMouseDown.value) {
    const cell = grid.value[pitchIdx][stepIdx];
    const wasActive = cell.active;

    if (drawMode.value) {
      const row = grid.value[pitchIdx];
      const hasDragGroupInRow = row.some((c) => c.active && c.groupId === currentDragGroupId.value);

      let groupId;
      if (hasDragGroupInRow) {
        // Use existing group for this row
        groupId = currentDragGroupId.value;
      } else {
        // Start a new group for this pitch row
        groupId = nextGroupId++;
      }

      grid.value[pitchIdx][stepIdx] = { active: true, groupId };

      if (!wasActive) {
        const midiNote = highestMidiNote - pitchIdx;
        await playIndividualNote(midiNote);
      }
    } else {
      grid.value[pitchIdx][stepIdx] = { active: false, groupId: null };
    }
  }
}

function onMouseUp() {
  isMouseDown.value = false;
  currentDragGroupId.value = null;
  window.removeEventListener('mouseup', onMouseUp);
  window.removeEventListener('touchend', onTouchEnd);
}

// Touch event handlers
async function onTouchStart(event, pitchIdx, stepIdx) {
  event.preventDefault();
  isTouchDevice.value = true;
  isMouseDown.value = true;
  const cell = grid.value[pitchIdx][stepIdx];
  drawMode.value = !cell.active;

  if (drawMode.value) {
    const groupId = nextGroupId++;
    currentDragGroupId.value = groupId;
    grid.value[pitchIdx][stepIdx] = { active: true, groupId };

    const midiNote = highestMidiNote - pitchIdx;
    await playIndividualNote(midiNote);
  } else {
    currentDragGroupId.value = null;
    grid.value[pitchIdx][stepIdx] = { active: false, groupId: null };
  }

  window.addEventListener('touchend', onTouchEnd);
  window.addEventListener('touchcancel', onTouchEnd);
}

async function onTouchMove(event) {
  if (!isMouseDown.value) return;

  event.preventDefault();

  const touch = event.touches[0];
  const element = document.elementFromPoint(touch.clientX, touch.clientY);

  if (element && element.classList.contains('piano-cell')) {
    const pitchIdx = parseInt(element.dataset.pitchIdx);
    const stepIdx = parseInt(element.dataset.stepIdx);

    if (!isNaN(pitchIdx) && !isNaN(stepIdx)) {
      const cell = grid.value[pitchIdx][stepIdx];
      const wasActive = cell.active;

      if (drawMode.value) {
        // Check if this pitch row already has a cell with currentDragGroupId
        // If not, create a new groupId for this pitch row
        const row = grid.value[pitchIdx];
        const hasDragGroupInRow = row.some(
          (c) => c.active && c.groupId === currentDragGroupId.value
        );

        let groupId;
        if (hasDragGroupInRow) {
          // Use existing group for this row
          groupId = currentDragGroupId.value;
        } else {
          // Start a new group for this pitch row
          groupId = nextGroupId++;
        }

        grid.value[pitchIdx][stepIdx] = { active: true, groupId };

        if (!wasActive) {
          const midiNote = highestMidiNote - pitchIdx;
          await playIndividualNote(midiNote);
        }
      } else {
        grid.value[pitchIdx][stepIdx] = { active: false, groupId: null };
      }
    }
  }
}

function onTouchEnd() {
  isMouseDown.value = false;
  window.removeEventListener('touchend', onTouchEnd);
  window.removeEventListener('touchcancel', onTouchEnd);
}

function isNoteOn(pitchIdx, stepIdx) {
  return grid.value[pitchIdx][stepIdx].active;
}

function isSameGroup(pitchIdx, stepIdx1, stepIdx2) {
  const cell1 = grid.value[pitchIdx]?.[stepIdx1];
  const cell2 = grid.value[pitchIdx]?.[stepIdx2];
  return (
    cell1?.active && cell2?.active && cell1.groupId !== null && cell1.groupId === cell2.groupId
  );
}

async function playPianoKey(pitchIdx) {
  const midiNote = highestMidiNote - pitchIdx;
  await playIndividualNote(midiNote);
}

async function playMidi() {
  try {
    const sequence = buildSequenceFromGrid();

    await initPlayer();

    // Stop any currently playing sequence
    if (player.isPlaying()) {
      player.stop();
    }

    // Start playing the sequence
    player.start(sequence);
  } catch (error) {
    console.error('Could not play MIDI sequence:', error);
  }
}

function saveSequence() {
  const sequence = buildSequenceFromGrid();
  emit('sequence-generated', sequence);
}

function resetGrid() {
  grid.value = Array.from({ length: numPitches }, () =>
    Array.from({ length: numSteps }, () => ({ active: false, groupId: null }))
  );
}

function generateRandomSequence() {
  resetGrid();

  // Number of random notes to generate (between 8 and 20)
  const numNotes = Math.floor(Math.random() * 13) + 8;

  for (let i = 0; i < numNotes; i++) {
    // Random pitch (0 to numPitches-1)
    const pitchIdx = Math.floor(Math.random() * numPitches);

    // Random start step (0 to numSteps-4 to ensure room for note)
    const startStep = Math.floor(Math.random() * (numSteps - 4));

    // Random note length (1 to 4 steps)
    const noteLength = Math.floor(Math.random() * 4) + 1;
    const endStep = Math.min(startStep + noteLength, numSteps);

    // Create a new group for this note
    const groupId = nextGroupId++;

    // Fill the grid cells for this note
    for (let stepIdx = startStep; stepIdx < endStep; stepIdx++) {
      grid.value[pitchIdx][stepIdx] = { active: true, groupId };
    }
  }
}

function handleClose() {
  emit('close');
}

// Touch feedback handlers for buttons
async function handleButtonTouchStart(buttonId, action) {
  activeButton.value = buttonId;
  loadingButton.value = buttonId;

  // Use requestAnimationFrame to ensure the UI updates before executing the action
  await new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });

  try {
    await action();
  } finally {
    loadingButton.value = null;
  }
}

function handleButtonTouchEnd() {
  // Small delay to show the feedback before removing it
  setTimeout(() => {
    activeButton.value = null;
  }, 150);
}

function buildSequenceFromGrid() {
  const notes = [];
  const processedGroups = new Set();

  grid.value.forEach((row, pitchIdx) => {
    row.forEach((cell, stepIdx) => {
      if (cell.active) {
        const groupId = cell.groupId;

        if (groupId !== null && !processedGroups.has(groupId)) {
          // Find all cells with the same groupId in this row
          let startStep = stepIdx;
          let endStep = stepIdx + 1;

          for (let i = stepIdx + 1; i < row.length; i++) {
            if (row[i].active && row[i].groupId === groupId) {
              endStep = i + 1;
            } else {
              break;
            }
          }

          processedGroups.add(groupId);
          const midiNote = highestMidiNote - pitchIdx;
          notes.push({
            pitch: midiNote,
            quantizedStartStep: String(startStep),
            quantizedEndStep: String(endStep),
          });
        } else if (groupId === null) {
          // No group: single cell note
          const midiNote = highestMidiNote - pitchIdx;
          notes.push({
            pitch: midiNote,
            quantizedStartStep: String(stepIdx),
            quantizedEndStep: String(stepIdx + 1),
          });
        }
      }
    });
  });

  return {
    notes,
    quantizationInfo: { stepsPerQuarter: 4 },
    totalQuantizedSteps: String(numSteps),
    tempos: [{ qpm: 120 }],
  };
}
</script>

<template>
  <div class="piano-roll-container">
    <div class="piano-roll">
      <div v-for="(pitch, pitchIdx) in pitches" :key="pitchIdx" class="piano-row">
        <!-- Piano Key Left -->
        <div
          class="piano-key"
          :class="{ black: pitch.isBlack }"
          @click="playPianoKey(pitchIdx)"
          @touchstart.prevent="playPianoKey(pitchIdx)"
          style="cursor: pointer"
        >
          {{ pitch.name }}
        </div>
        <!-- Grid Steps -->
        <div
          v-for="stepIdx in numSteps"
          :key="stepIdx - 1"
          class="piano-cell"
          :class="{
            active: isNoteOn(pitchIdx, stepIdx - 1),
            'active-left': isSameGroup(pitchIdx, stepIdx - 2, stepIdx - 1),
            'active-right': isSameGroup(pitchIdx, stepIdx - 1, stepIdx),
            'bar-line': stepIdx % 16 === 0 && stepIdx < numSteps,
          }"
          :data-pitch-idx="pitchIdx"
          :data-step-idx="stepIdx - 1"
          @mousedown="onMouseDown(pitchIdx, stepIdx - 1)"
          @mouseenter="onMouseEnter(pitchIdx, stepIdx - 1)"
          @touchstart="onTouchStart($event, pitchIdx, stepIdx - 1)"
          @touchmove="onTouchMove($event)"
          @contextmenu.prevent
        ></div>
      </div>
      <div class="draw-btn-container">
        <div class="draw-play-safe-btn-container">
          <button
            @click="triggerFileInput"
            @touchstart="
              (e) => {
                e.preventDefault();
                handleButtonTouchStart('upload', triggerFileInput);
              }
            "
            @touchend="handleButtonTouchEnd"
            @touchcancel="handleButtonTouchEnd"
            :class="{ 'touch-active': activeButton === 'upload' }"
          >
            <span class="button-content"> Upload MIDI </span>
          </button>

          <!-- Hidden File Input -->
          <input
            type="file"
            ref="fileInput"
            accept=".mid,.midi"
            style="display: none"
            @change="importMidiFile"
          />

          <button
            @click="playMidi"
            @touchstart="
              (e) => {
                e.preventDefault();
                handleButtonTouchStart('play', playMidi);
              }
            "
            @touchend="handleButtonTouchEnd"
            @touchcancel="handleButtonTouchEnd"
            :class="{ 'touch-active': activeButton === 'play' }"
          >
            <span v-if="loadingButton === 'play'" class="button-content">
              <div class="button-spinner"></div>
              <span style="visibility: hidden">
                <font-awesome-icon icon="play" />
                Play
              </span>
            </span>
            <span v-else class="button-content">
              <font-awesome-icon icon="play" />
              Play
            </span>
          </button>
          <button
            @click="saveSequence"
            @touchstart="
              (e) => {
                e.preventDefault();
                handleButtonTouchStart('save', saveSequence);
              }
            "
            @touchend="handleButtonTouchEnd"
            @touchcancel="handleButtonTouchEnd"
            :class="{ 'touch-active': activeButton === 'save' }"
          >
            <span v-if="loadingButton === 'save'" class="button-content">
              <div class="button-spinner"></div>
              <span style="visibility: hidden">
                <font-awesome-icon icon="save" />
                Save
              </span>
            </span>
            <span v-else class="button-content">
              <font-awesome-icon icon="save" />
              Save
            </span>
          </button>
          <button
            @click="generateRandomSequence"
            @touchstart="
              (e) => {
                e.preventDefault();
                handleButtonTouchStart('random', generateRandomSequence);
              }
            "
            @touchend="handleButtonTouchEnd"
            @touchcancel="handleButtonTouchEnd"
            :class="{ 'touch-active': activeButton === 'random' }"
          >
            <span v-if="loadingButton === 'random'" class="button-content">
              <div class="button-spinner"></div>
              <span style="visibility: hidden">
                <i class="fa-solid fa-dice"></i>
              </span>
            </span>
            <span v-else class="button-content">
              <i class="fa-solid fa-dice"></i>
            </span>
          </button>
        </div>
        <div class="draw-reset-close-btn-container">
          <button
            @click="resetGrid"
            @touchstart="
              (e) => {
                e.preventDefault();
                handleButtonTouchStart('reset', resetGrid);
              }
            "
            @touchend="handleButtonTouchEnd"
            @touchcancel="handleButtonTouchEnd"
            :class="{ 'touch-active': activeButton === 'reset' }"
          >
            <span v-if="loadingButton === 'reset'" class="button-content">
              <div class="button-spinner"></div>
              <span style="visibility: hidden">
                <font-awesome-icon icon="rotate-left" />
                Reset
              </span>
            </span>
            <span v-else class="button-content">
              <font-awesome-icon icon="rotate-left" />
              Reset
            </span>
          </button>
          <button
            @click="handleClose"
            @touchstart="
              (e) => {
                e.preventDefault();
                handleButtonTouchStart('close', handleClose);
              }
            "
            @touchend="handleButtonTouchEnd"
            @touchcancel="handleButtonTouchEnd"
            :class="{ 'touch-active': activeButton === 'close' }"
          >
            <span v-if="loadingButton === 'close'" class="button-content">
              <div class="button-spinner"></div>
              <span style="visibility: hidden">
                <font-awesome-icon icon="times" />
                Close
              </span>
            </span>
            <span v-else class="button-content">
              <font-awesome-icon icon="times" />
              Close
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.piano-roll-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  box-shadow:
    0 4px 10px rgba(0, 0, 0, 0.1),
    0 4px 10px rgba(0, 0, 0, 0.1);
  background-color: rgb(202, 202, 202);
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 5px;
  z-index: 9999;
  touch-action: none;
  -webkit-overflow-scrolling: touch;
  max-height: 95vh;
  overflow: auto;
}

.piano-roll {
  display: flex;
  flex-direction: column;
  user-select: none;
  font-family: sans-serif;
}

.piano-row {
  display: flex;
  flex-direction: row;
}

.piano-key {
  width: 50px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  border: 1px solid #ccc;
  background: #fff;
  font-size: 12px;
  box-sizing: border-box;
  touch-action: manipulation;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
}

.piano-key.black {
  background: #333;
  color: white;
}

.piano-cell {
  width: 25px;
  height: 24px;
  border: 1px solid #eee;
  background-color: #fff;
  cursor: crosshair;
  box-sizing: border-box;
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

.piano-cell.active {
  background-color: #4fc3f7;
}

.piano-cell.active.active-left {
  border-left: none;
}

.piano-cell.active.active-right {
  border-right: none;
}

.piano-cell.bar-line {
  border-right: 2px solid rgba(0, 0, 0, 0.3);
  position: relative;
}

.draw-btn-container {
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
}

.draw-btn-container button {
  color: white;
  background-color: black;
  border-radius: 5px;
  padding-top: 5px;
  padding-bottom: 5px;
  padding-left: 10px;
  padding-right: 10px;
  transition: all 0.1s ease-out;
  border: none;
  outline: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: rgba(255, 255, 255, 0.2);
  user-select: none;
  min-width: fit-content;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  position: relative;
  margin: 2px;
}

.button-content {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  position: relative;
}

.button-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

@keyframes spin {
  0% {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  100% {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

.draw-btn-container button:hover,
.draw-btn-container button:active,
.draw-btn-container button.touch-active {
  color: black;
  background-color: white;
  outline: solid 1px black;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.draw-btn-container button:hover .button-spinner,
.draw-btn-container button:active .button-spinner,
.draw-btn-container button.touch-active .button-spinner {
  border: 2px solid rgba(0, 0, 0, 0.3);
  border-top: 2px solid black;
}

.draw-play-safe-btn-container button:not(:first-child),
.draw-reset-close-btn-container button:not(:first-child) {
  margin-left: 5px;
}

/* Media Queries */
@media (max-width: 1650px) {
  .piano-cell {
    width: 22px;
  }
}

@media (max-width: 1500px) {
  .piano-cell {
    width: 20px;
  }
}

@media (max-width: 1400px) {
  .piano-cell {
    width: 15px;
  }
}

@media (max-width: 1100px) {
  .piano-cell {
    width: 13px;
  }
}

@media (max-width: 1000px) {
  .piano-cell {
    width: 10px;
  }
}

@media (max-width: 750px) {
  .piano-cell {
    width: 7px;
  }
}

@media (max-width: 550px) {
  .piano-cell {
    width: 6px;
  }
}
</style>
