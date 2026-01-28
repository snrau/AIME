import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useGridHistoryStore = defineStore('gridHistory', () => {
  // Current step in history
  const currentStep = ref(0);

  // History of grid states
  const history = ref([[]]);

  // Computed property to get the current grid state
  const currentGrid = computed(() => {
    return history.value[currentStep.value] || [];
  });

  // check whether we can undo
  const canUndo = computed(() => currentStep.value > 0);

  // Check wether we can redo
  const canRedo = computed(() => currentStep.value < history.value.length - 1);

  // Add a new state to history
  function saveState(gridState) {
    // deep clone
    const clonedGrid = gridState.map((item) => ({ ...item }));

    // If we are not at the end of history truncate future states, branch out
    if (currentStep.value < history.value.length - 1) {
      history.value = history.value.slice(0, currentStep.value + 1);
    }

    // Add the new state and move to it
    history.value.push(clonedGrid);
    currentStep.value = history.value.length - 1;
  }

  // Go back one step in history
  function undo() {
    if (canUndo.value) {
      currentStep.value--;
      return currentGrid.value;
    }
    return null;
  }

  // Go forward one step in history
  function redo() {
    if (canRedo.value) {
      currentStep.value++;
      return currentGrid.value;
    }
    return null;
  }

  function initializeHistory(initialGrid) {
    history.value = [initialGrid.map((item) => ({ ...item }))];
    currentStep.value = 0;
  }

  function resetHistory() {
    history.value = [[]];
    currentStep.value = 0;
  }

  return {
    history,
    currentStep,
    currentGrid,
    canUndo,
    canRedo,
    saveState,
    undo,
    redo,
    initializeHistory,
    resetHistory,
  };
});
