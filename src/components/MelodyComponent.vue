<script setup>
import SquareComponent from './SquareComponent.vue';
import { Colors } from '@/constants/colors';
import * as mm from '@magenta/music';
import { ref } from 'vue';

import { useResponsiveMelody } from '@/utils/gridUtils';
import { useMidiPlayer } from '../stores/midioutput.js';

// Use responsive melody configuration
const {
  rows,
  cols,
  squareHeight,
  squareWidth,
  squareMargin,
  roomContainerWidth,
  roomContainerHeight,
} = useResponsiveMelody();

const outputname = useMidiPlayer();

// Create a 2D array to represent the grid
const grid = ref(
  Array.from({ length: rows.value }, (_, row) =>
    Array.from({ length: cols.value }, (_, col) => ({
      id: `${row}-${col}`,
      color: Colors.BROWN,
      sequenceData: null,
      isPlaying: false,
    }))
  )
);

function copyToSquare(x, y, sequenceData) {
  // Check if the coordinates are within bounds
  if (y < 0 || y >= grid.value.length || x < 0 || x >= grid.value[0].length) {
    console.warn(`Cannot copy to melody square: coordinates (${x}, ${y}) are out of bounds`);
    return;
  }

  const targetSquare = grid.value[y][x];
  if (targetSquare) {
    targetSquare.sequenceData = JSON.parse(JSON.stringify(sequenceData));
  }
}

function stopPlayer() {
  try {
    if (player && player.isPlaying()) {
      player.stop();
      isPlaying.value = false;
    }
    // Clear the highlight interval
    if (highlightInterval) {
      clearInterval(highlightInterval);
      highlightInterval = null;
    }
    // Reset all square highlighting
    grid.value.flat().forEach((sq) => (sq.isPlaying = false));
  } catch (error) {
    console.warn('Error stopping melody player:', error);
  }
}

defineExpose({
  copyToSquare,
  stopPlayer,
  grid,
});

function buildSequenceFromSquares() {
  const notes = [];
  // Start for first Square
  let currentStep = 0;

  grid.value.forEach((row) => {
    row.forEach((square) => {
      if (square.sequenceData?.notes?.length) {
        square.sequenceData.notes.forEach((note) => {
          notes.push({
            pitch: note.pitch,
            quantizedStartStep: Number(note.quantizedStartStep) + currentStep,
            quantizedEndStep: Number(note.quantizedEndStep) + currentStep,
          });
        });

        // Offset for the next square
        currentStep += 64;
      }
    });
  });

  return {
    notes,
    quantizationInfo: { stepsPerQuarter: 4 },
    totalQuantizedSteps: notes.length ? Math.max(...notes.map((n) => n.quantizedEndStep)) : 0,
    tempos: [{ qpm: 120 }],
  };
}

let player = null;
let highlightInterval = null;
let currentStep = 0;
let lastStep = 0;
const isPlaying = ref(false);

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

async function resetMelody() {
  if (player.isPlaying()) {
    player.stop();
  }
  isPlaying.value = false;

  // Clear the highlight interval
  if (highlightInterval) {
    clearInterval(highlightInterval);
    highlightInterval = null;
  }
  // Reset all square highlighting
  grid.value.flat().forEach((sq) => (sq.isPlaying = false));
  lastStep = 0;
}

async function toggleMelody() {
  const seq = buildSequenceFromSquares();
  const p = await initPlayer();

  if (!seq.notes?.length) {
    console.warn('No sequence to play');
    return;
  }

  // Player is not playing and not paused
  if (!isPlaying.value && p.getPlayState() !== 'paused') {
    currentStep = lastStep;
    highlightPlayingSquares(p, seq);
    p.start(seq);
    isPlaying.value = true;

    // stop tracking when done
    const durationMs = (seq.totalQuantizedSteps / 4) * (60000 / 120);
    console.log(durationMs);
    setTimeout(() => {
      console.log('Timeout reached, loop', seq);
      p.seekTo(0);
      highlightPlayingSquares(p, seq);
      console.log(p.getPlayState());
      /*
      isPlaying.value = false;
      if (highlightInterval) {
        clearInterval(highlightInterval);
        highlightInterval = null;
      }
      lastStep = 0;
      grid.value.flat().forEach((sq) => (sq.isPlaying = false));
      */
    }, durationMs);

  // Player is playing
  } else if (isPlaying.value && p.isPlaying()) {
    p.pause();
    isPlaying.value = false;
    // Clear highlighting when paused
    if (highlightInterval) {
      clearInterval(highlightInterval);
      highlightInterval = null;

    }
    lastStep = currentStep;
    grid.value.flat().forEach((sq) => (sq.isPlaying = false));

    // Player is paused
  } else if (p.getPlayState() === 'paused') {
    p.resume();
    isPlaying.value = true;
    highlightPlayingSquares(p, seq, lastStep);
  }
}

function highlightPlayingSquares(p, seq, startStep = 0) {
    // Clear any existing interval
  if (highlightInterval) {
    clearInterval(highlightInterval);
    highlightInterval = null;
  }

  const stepsPerQuarter = seq.quantizationInfo?.stepsPerQuarter || 4;
  const qpm = seq.tempos?.[0]?.qpm || 120;
  const stepDurationMs = 60000 / qpm / stepsPerQuarter;

  const totalSteps = seq.totalQuantizedSteps || 0;
  currentStep = startStep;

  highlightInterval = setInterval(() => {
    // Stop highlighting if playback stops
    if (!p.isPlaying()) {
      grid.value.flat().forEach((sq) => (sq.isPlaying = false));
      clearInterval(highlightInterval);
      highlightInterval = null;
      return;
    }

    // reset all
    grid.value.flat().forEach((sq) => (sq.isPlaying = false));

    // determine which square should be highlighted based on the current step
    let accumulatedSteps = 0;
    for (let row = 0; row < rows.value; row++) {
      for (let col = 0; col < cols.value; col++) {
        const square = grid.value[row][col];
        const seqData = square.sequenceData;

        const squareLength = seqData?.notes?.length
          ? Math.max(...seqData.notes.map((n) => Number(n.quantizedEndStep)))
          : 64;

        const squareStart = accumulatedSteps;
        const squareEnd = accumulatedSteps + squareLength;

        if (currentStep >= squareStart && currentStep < squareEnd) {
          square.isPlaying = true;
        }

        accumulatedSteps += 64;
      }
    }

    currentStep++;

    // stop interval when we reach the end
    if (currentStep > totalSteps) {
      clearInterval(highlightInterval);
      highlightInterval = null;
      grid.value.flat().forEach((sq) => (sq.isPlaying = false));
    }
  }, stepDurationMs);
}
</script>

<template>
  <div class="melody-container flex-center-full" data-component="melody">
    <p class="melody-title">Melody</p>
    <div
      class="melody-wrapper flex-center-full"
      data-component="melody"
      :style="{ width: roomContainerWidth + 'px', height: roomContainerHeight + 'px' }"
    >

      <div class="melody-rewind">
        <button @click="resetMelody">
          <i :class="'fas fa-backward'"></i>
        </button>
      </div>
      <div class="melody-play">
        <button @click="toggleMelody">
          <i :class="isPlaying ? 'fas fa-pause' : 'fas fa-play'"></i>
        </button>
      </div>

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
            :color="square.isPlaying ? Colors.YELLOW : square.color"
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
.melody-container {
  padding-top: 30px;
  padding-bottom: 10px;
  position: relative;
  background-color: var(--component-bg-color);
}

.melody-wrapper,
.melody-container {
  border: solid 1px var(--border-color);
  border-radius: 10px;
  flex-direction: column;
  position: relative;
}

.melody-title {
  position: absolute;
  top: -8px;
  left: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color);
  opacity: 0.7;
}

.room-row {
  display: flex;
}

@media (max-width: 1300px) {
  .melody-container {
    width: 1200px !important;
    margin: auto;
  }
}

@media (max-width: 1200px) {
  .melody-container {
    width: 1000px !important;
    margin: auto;
  }
}

@media (max-width: 1100px) {
  .melody-container {
    width: 900px !important;
    margin: auto;
  }
}

@media (max-width: 900px) {
  .melody-container {
    width: 700px !important;
    margin: auto;
    margin-top: 0px !important;
  }
}

@media (max-width: 700px) {
  .melody-container {
    width: 600px !important;
    margin: auto;
  }
}

@media (max-width: 600px) {
  .melody-container {
    width: 590px !important;
    margin: auto;
  }
}

@media (max-width: 590px) {
  .melody-container {
    width: 500px !important;
    margin: auto;
  }
}

@media (max-width: 500px) {
  .melody-container {
    width: 475px !important;
    margin: auto;
  }
}

.melody-rewind {
  position: absolute;
  left: -130px;
  top: 50%;
  transform: translateY(-50%);
}

.melody-rewind button {
  display: block;
  height: 50px;
  width: 50px;
  border-radius: 50%;
  border: 2px solid #6c7686;
}

.melody-rewind button:hover {
  cursor: pointer;
  opacity: 0.7;
}

.melody-rewind button i {
  color: #6c7686;
}

.melody-play {
  position: absolute;
  left: -60px;
  top: 50%;
  transform: translateY(-50%);
}

.melody-play button {
  display: block;
  height: 50px;
  width: 50px;
  border-radius: 50%;
  border: 2px solid #6c7686;
}

.melody-play button:hover {
  cursor: pointer;
  opacity: 0.7;
}

.melody-play button i {
  color: #6c7686;
}

@media (max-width: 1300px) {
  .melody-play {
    left: -60px;
  }
}

@media (max-width: 1200px) {
  .melody-play {
    left: -60px;
  }
}

@media (max-width: 1100px) {
  .melody-play {
    left: -60px;
  }
}

@media (max-width: 900px) {
  .melody-play {
    left: -55px;
  }

  .melody-play button {
    height: 45px;
    width: 45px;
  }
}

@media (max-width: 700px) {
  .melody-play {
    left: 50px;
    top: -28px;
    transform: none;
  }

  .melody-play button {
    height: 22px;
    width: 22px;
    font-size: 10px;
  }

  .melody-play button i {
    font-size: 10px;
  }
}

@media (max-width: 500px) {
  .melody-play {
    left: 55px;
    top: -27px;
    transform: none;
  }

  .melody-play button {
    height: 18px;
    width: 18px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .melody-play button i {
    font-size: 8px;
    margin-left: 2px;
  }
}
</style>
