<script setup>
import { ref, onMounted } from 'vue';
import { useMidiPlayer } from '../stores/midioutput.js'


const midiPlayerStore = useMidiPlayer();


// Reactive variables
const midiOutputs = ref([]);
const selectedOutput = ref('default');
const isLoading = ref(false);



// Fetch MIDI outputs
const fetchMidiOutputs = async () => {
  isLoading.value = true;
  midiOutputs.value = [];

  try {
    const midiAccess = await navigator.requestMIDIAccess();
    const outputs = Array.from(midiAccess.outputs.values());
    midiOutputs.value = outputs.map(output => ({
      id: output.id,
      name: output.name,
    }));
    selectedOutput.value = midiOutputs.value.find(output => output.name === midiPlayerStore.output)?.id || 'default'
  } catch (error) {
    console.error('Failed to access MIDI outputs:', error);
  } finally {
    isLoading.value = false;
  }
};

// Reload MIDI outputs
const reloadMidiOutputs = () => {
  fetchMidiOutputs();
};

// Initialize MIDI outputs on mount
onMounted(() => {
  fetchMidiOutputs();
});

// Handle output selection
const selectOutput = (outputId) => {
  selectedOutput.value = outputId;

  // Update the MIDI player store
  if (outputId === 'default') {
    midiPlayerStore.setMidiPlayer('default'); // Set to default output
  } else {
    const selected = midiOutputs.value.find(output => output.id === outputId);
    midiPlayerStore.setMidiPlayer(selected?selected.name:'default');
  }

};
</script>

<template>
  <div class="midi-output-container">
    <h2 class="title">MIDI Output Selector</h2>

    <div class="output-list">
      <label class="output-item" v-for="output in midiOutputs" :key="output.id">
        <input
          type="radio"
          :value="output.id"
          v-model="selectedOutput"
          @change="selectOutput(output.id)"
        />
        {{ output.name }}
      </label>

      <label class="output-item">
        <input
          type="radio"
          value="default"
          v-model="selectedOutput"
          @change="selectOutput('default')"
        />
        Default Output
      </label>
    </div>

    <button class="reload-button" @click="reloadMidiOutputs" :disabled="isLoading">
      {{ isLoading ? 'Loading...' : 'Reload MIDI Outputs' }}
    </button>

    <p class="selected-output">
      Selected Output: {{ selectedOutput === 'default' ? 'default' : midiOutputs.find(output => output.id === selectedOutput)?.name || 'None' }}
    </p>
  </div>
</template>

<style scoped>
.midi-output-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  user-select: none;
  margin-top: 20px;
  color: white;
}

.title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 20px;
}

.output-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.output-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.reload-button {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: bold;
  color: white;
  background-color: #87CEEB;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.reload-button:disabled {
  background-color: #888;
  cursor: not-allowed;
}

.reload-button:hover:not(:disabled) {
  background-color: #45a049;
}

.selected-output {
  margin-top: 20px;
  font-size: 14px;
  font-style: italic;
}
</style>