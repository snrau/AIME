import { ref, watch } from 'vue';
import { getSquareColor } from '@/utils/gridUtils';
import { useTonicKeyStore } from '@/stores/tonicKey';

export function useGrid(rows, cols) {
  const grid = ref([]);
  const tonicKeyStore = useTonicKeyStore();

  // Watch for tonic key changes and recalculate all square colors
  watch(
    () => tonicKeyStore.tonicKey,
    (newTonicKey) => {
      recalculateAllColors(newTonicKey);
    }
  );

  const recalculateAllColors = (tonicKey) => {
    grid.value.forEach((square) => {
      square.color = getSquareColor(square.y, square.x, rows, cols, square.sequenceData, tonicKey);
    });
  };

  const getSquareAtPosition = (x, y) => {
    return grid.value.find((square) => square.x === x && square.y === y);
  };

  const placeSquare = (x, y, sequenceData = null, isLoading = false) => {
    if (x < 0 || x >= cols || y < 0 || y >= rows) {
      console.warn(`Invalid position: (${x}, ${y}). Position must be within grid bounds.`);
      return;
    }

    const newSquare = {
      id: `${y}-${x}`,
      x,
      y,
      color: getSquareColor(y, x, rows, cols, sequenceData, tonicKeyStore.tonicKey),
      sequenceData,
      // firstSquare is now computed: true if grid is empty, false otherwise
      firstSquare: grid.value.length === 0,
      isLoading,
    };

    // Check if square already exists at this position
    const existingSquareIndex = grid.value.findIndex((square) => square.x === x && square.y === y);

    if (existingSquareIndex === -1) {
      grid.value.push(newSquare);
    } else {
      // Replace existing square
      grid.value[existingSquareIndex] = newSquare;
    }
  };

  const updateSquare = (x, y, sequenceData, isLoading = false) => {
    const existingSquareIndex = grid.value.findIndex((square) => square.x === x && square.y === y);

    if (existingSquareIndex !== -1) {
      // Update existing square properties
      grid.value[existingSquareIndex] = {
        ...grid.value[existingSquareIndex],
        sequenceData,
        isLoading,
        color: getSquareColor(y, x, rows, cols, sequenceData, tonicKeyStore.tonicKey),
      };
    } else {
      console.warn(`No square found at position (${x}, ${y}) to update`);
    }
  };

  const removeSquare = (x, y) => {
    grid.value = grid.value.filter((square) => !(square.x === x && square.y === y));
  };

  const removeSquares = (positions) => {
    grid.value = grid.value.filter(
      (square) => !positions.some((pos) => pos.x === square.x && pos.y === square.y)
    );
  };

  const clearGrid = () => {
    grid.value = [];
  };

  const initializeGrid = () => {
    // Place one square in the middle after grid initialization
    const middleX = Math.floor(cols / 2);
    const middleY = Math.floor(rows / 2);
    placeSquare(middleX, middleY);
  };

  return {
    grid,
    getSquareAtPosition,
    placeSquare,
    removeSquare,
    removeSquares,
    clearGrid,
    initializeGrid,
    updateSquare,
    recalculateAllColors,
  };
}
