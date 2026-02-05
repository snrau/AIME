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

let bufferseq = null

let playLoopTimeout = null;

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

function handleRemoveSquare(eventData) {
  const { x, y, target } = eventData;
  if (target === 'melody') {
    grid.value[y][x].sequenceData = null;
    grid.value[y][x].isPlaying = false;
    for (let i = x + 1; i < grid.value[y].length; i++) {
      if (grid.value[y][i].sequenceData !== null) {
        // Move the data to the previous cell
        grid.value[y][i - 1] = { ...grid.value[y][i] };

        // Clear the current cell
        grid.value[y][i] = {
          id: `${y}-${i}`,
          color: Colors.BROWN,
          sequenceData: null,
          isPlaying: false,
        };
      } else {
        // Stop shifting if we encounter a null cell
        grid.value[y][i] = {
          id: `${y}-${i}`,
          color: Colors.BROWN,
          sequenceData: null,
          isPlaying: false,
        };
        break;
      }
    }
  }
}

function stopPlayer() {
  try {
    if (player1 && player1.isPlaying()) {
      player1.stop();
      isPlaying.value = false;
    } else if (player2 && player2.isPlaying()) {
      player2.stop();
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

let player1 = null;
let player2 = null;
let activePlayer = null; // Tracks the currently active player
let highlightInterval = null;
let currentStep = 0;
let lastStep = 0;
const isPlaying = ref(false);

async function initPlayer() {
  if (
    player1 &&
    player2 &&
    player1.outputs[0].name === outputname.output &&
    player2.outputs[0].name === outputname.output
  )
    return;

  if (outputname.output === 'default') {
    player1 = new mm.Player();
    player2 = new mm.Player();
    console.log('Using Magenta Audio Players.', player1, player2);
    player1.outputs = [{ name: 'default' }];
    player2.outputs = [{ name: 'default' }];
    activePlayer = player1;
    return;
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
          const midiPlayer1 = new mm.MIDIPlayer();
          const midiPlayer2 = new mm.MIDIPlayer();
          midiPlayer1.outputs = [output];
          midiPlayer2.outputs = [output];
          player1 = midiPlayer1;
          player2 = midiPlayer2;
          activePlayer = player1;

          console.log('Using MIDI output:', output.name);
        } else {
          console.warn('Specified MIDI output not found: using AudioPlayer instead.');
          player1 = new mm.Player();
          player2 = new mm.Player();
        }
        return;
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
  player1 = new mm.Player();
  player2 = new mm.Player();
  activePlayer = player1;
  console.log('Using Magenta Audio Player.');

  return;
}

async function resetMelody() {
  if (player1.isPlaying()) {
    player1.stop();
  }
  if (player2.isPlaying()) {
    player2.stop();
  }
  isPlaying.value = false;

  if (playLoopTimeout) {
    clearInterval(playLoopTimeout);
    playLoopTimeout = null;
  }

  // Clear the highlight interval
  if (highlightInterval) {
    clearInterval(highlightInterval);
    highlightInterval = null;
  }
  // Reset all square highlighting
  grid.value.flat().forEach((sq) => (sq.isPlaying = false));
  lastStep = 0;
}

function playLoop(seq) {
  if (!seq.notes?.length) {
    console.warn('No sequence to play');
    return;
  }

  if (isPlaying.value === false) {
    return;
  }
  console.log('switch player', seq);

  if (activePlayer === player1) {
    player1.stop();
    player2.start(seq).then(() => {
      playLoop(bufferseq, dMs);
    });
    activePlayer = player2;
  } else {
    player2.stop();
    player1.start(seq).then(() => {
      playLoop(bufferseq, dMs);
    });
    activePlayer = player1;
  }

  highlightPlayingSquares(activePlayer, seq);
  const dMs = (seq.totalQuantizedSteps / 4) * (60000 / 120);
  buildSequenceTimeout(dMs);

  /*clearInterval(playLoopTimeout);
  console.log(bufferseq, activePlayer === player1, player1.getPlayState(), player2.getPlayState());
  playLoopTimeout = setTimeout(() => {
    const dMs = (bufferseq.totalQuantizedSteps / 4) * (60000 / 120);
    playLoop(bufferseq, dMs);
  }, durationMs);
  */
}

let buildSequenceTimeoutId = null;

function buildSequenceTimeout(duration){
  buildSequenceTimeoutId = setTimeout(() => {
    bufferseq = buildSequenceFromSquares();
    }, duration - 500);
}

async function toggleMelody() {
  const seq = buildSequenceFromSquares();
  await initPlayer();

  if (!seq.notes?.length) {
    console.warn('No sequence to play');
    return;
  }

  // Player is not playing and not paused
  if (!isPlaying.value && activePlayer.getPlayState() !== 'paused') {
    currentStep = lastStep;
    highlightPlayingSquares(activePlayer, seq);
    activePlayer.start(seq).then(() => {
      playLoop(bufferseq);
      clearInterval(buildSequenceTimeoutId);
    });
    isPlaying.value = true;

    // stop tracking when done
    const durationMs = (seq.totalQuantizedSteps / 4) * (60000 / 120);
    clearInterval(playLoopTimeout);
    buildSequenceTimeout(durationMs);
    /*
    playLoopTimeout = setTimeout(() => {
      console.log("play playLoop", bufferseq);
      const dMs = (bufferseq.totalQuantizedSteps / 4) * (60000 / 120);
      playLoop(bufferseq, dMs);
    }, durationMs);
    */

  // Player is playing
  } else if (isPlaying.value && activePlayer.isPlaying()) {
    activePlayer.pause();
    isPlaying.value = false;
    // Clear highlighting when paused
    if (highlightInterval) {
      clearInterval(highlightInterval);
      highlightInterval = null;
    }
    if(buildSequenceTimeoutId){
      clearTimeout(buildSequenceTimeoutId);
      buildSequenceTimeoutId = null;
    }
    lastStep = currentStep;
    grid.value.flat().forEach((sq) => (sq.isPlaying = false));

    // Player is paused
  } else if (activePlayer.getPlayState() === 'paused') {
    activePlayer.resume();
    isPlaying.value = true;
    highlightPlayingSquares(activePlayer, seq, lastStep);
    const dMs = ((seq.totalQuantizedSteps - lastStep - 1) / 4) * (60000 / 120);
    buildSequenceTimeout(dMs);
    /*
    const dMs = ((seq.totalQuantizedSteps - lastStep - 1) / 4) * (60000 / 120);
    clearInterval(playLoopTimeout);
    buildSequenceTimeout(dMs);
    playLoopTimeout = setTimeout(() => {
      console.log("resume playLoop");
      playLoop(bufferseq);
    }, dMs);
    */
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
            @remove-square="handleRemoveSquare"
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
    width: 1160px !important;
    margin: auto;
  }
}

@media (max-width: 1200px) {
  .melody-container {
    width: 990px !important;
    margin: auto;
  }
}

@media (max-width: 1100px) {
  .melody-container {
    width: 950px !important;
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
  left: -150px;
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
  left: -80px;
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
    left: -80px;
  }
  .melody-rewind {
    left: -150px;
  }
}

@media (max-width: 1200px) {
  .melody-play {
    left: -60px;
  }
  .melody-rewind {
    left: -130px;
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
