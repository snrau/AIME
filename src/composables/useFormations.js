import { ref, watch } from 'vue';
import { GRID_CONFIG } from '@/utils/gridUtils';

export function useFormations(
  grid,
  getSquareAtPosition,
  magentaService,
  placeSquare,
  clearGrid,
  rows,
  cols,
  isBatchOperation
) {
  const squareFormations = ref([]);
  const isFormationLoading = ref(false);

  const detectSquareFormations = () => {
    const formations = [];

    for (let y = 0; y < GRID_CONFIG.rows - 1; y++) {
      for (let x = 0; x < GRID_CONFIG.cols - 1; x++) {
        const topLeft = getSquareAtPosition(x, y);
        const topRight = getSquareAtPosition(x + 1, y);
        const bottomLeft = getSquareAtPosition(x, y + 1);
        const bottomRight = getSquareAtPosition(x + 1, y + 1);

        if (topLeft && topRight && bottomLeft && bottomRight) {
          formations.push({
            x: x + 0.5,
            y: y + 0.5,
            corners: [topLeft, topRight, bottomLeft, bottomRight],
          });
        }
      }
    }

    return formations;
  };

  const updateFormations = () => {
    squareFormations.value = detectSquareFormations();
  };

  watch(() => [...grid.value], updateFormations, { deep: true });

  // handler for bilateral interpolation on formation button click
  const handleFormationButtonClick = async (formation) => {
    console.log('>>> handleFormationButtonClick STARTED');
    isFormationLoading.value = true;

    try {
      // Extract the 4 corners of the formation
      const topLeft = formation.corners[0];
      const topRight = formation.corners[1];
      const bottomLeft = formation.corners[2];
      const bottomRight = formation.corners[3];

      // Check which corners are missing sequence data
      const missingDataCorners = [
        { name: 'Top Left', data: topLeft.sequenceData, square: topLeft },
        { name: 'Bottom Left', data: bottomLeft.sequenceData, square: bottomLeft },
        { name: 'Top Right', data: topRight.sequenceData, square: topRight },
        { name: 'Bottom Right', data: bottomRight.sequenceData, square: bottomRight },
      ].filter((corner) => !corner.data);

      // If any corner is missing data notify user and cancel process
      if (missingDataCorners.length > 0) {
        alert('Not all 4 squares have node sequences. Please draw a sequence.');
        isFormationLoading.value = false;

        // Reset batch operation flag since we're canceling
        if (isBatchOperation) {
          isBatchOperation.value = false;
        }
        return;
      }

      // Quantize sequences if needed
      const sequences = [
        topLeft.sequenceData,
        bottomLeft.sequenceData,
        topRight.sequenceData,
        bottomRight.sequenceData,
      ].map((seq) => {
        if (!seq.quantizationInfo) {
          return magentaService.quantizeSequence(seq, 4);
        }
        return seq;
      });

      // For a bilinear interpolation, we use the grid dimensions
      // For optimal spacing we use the number of columns and rows
      const interpolationColumns = cols;
      const interpolationRows = rows;

      // Generate interpolated sequences using bilinear interpolation
      // The result is in row-major order with corners at [0, 0], [0, cols-1], [rows-1, 0], [rows-1, cols-1]
      const interpolatedSequences = await magentaService.bilinearInterpolate(
        sequences,
        [interpolationColumns, interpolationRows],
        0.5
      );

      console.log('>>> CLEARING GRID');
      clearGrid();

      console.log('>>> PLACING', interpolationRows * interpolationColumns, 'squares');
      // Fill the grid with interpolated sequences
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // Calculate the index in the interpolatedSequences array
          const index = row * interpolationColumns + col;

          // Map the original formation corners to the grid corners
          let sequenceToUse;

          // Check if this position is one of the grid corners
          if (row === 0 && col === 0) {
            // Top-left corner of grid gets the top-left formation sequence
            sequenceToUse = topLeft.sequenceData;
          } else if (row === 0 && col === cols - 1) {
            // Top-right corner of grid gets the top-right formation sequence
            sequenceToUse = topRight.sequenceData;
          } else if (row === rows - 1 && col === 0) {
            // Bottom-left corner of grid gets the bottom-left formation sequence
            sequenceToUse = bottomLeft.sequenceData;
          } else if (row === rows - 1 && col === cols - 1) {
            // Bottom-right corner of grid gets the bottom-right formation sequence
            sequenceToUse = bottomRight.sequenceData;
          } else if (index < interpolatedSequences.length) {
            // Other positions get interpolated sequences
            sequenceToUse = interpolatedSequences[index];
          }

          // Place the square with its corresponding sequence
          if (sequenceToUse) {
            placeSquare(col, row, sequenceToUse);
          }
        }
      }

      isFormationLoading.value = false;

      console.log('>>> Setting batch operation flag to FALSE');
      // End batch operation and trigger a single save
      if (isBatchOperation) {
        isBatchOperation.value = false;
      }
      console.log('>>> handleFormationButtonClick COMPLETED');
    } catch (error) {
      console.error('Error during bilinear interpolation:', error);
      isFormationLoading.value = false;

      // End batch operation even on error
      if (isBatchOperation) {
        isBatchOperation.value = false;
      }
    }
  };

  return {
    squareFormations,
    updateFormations,
    handleFormationButtonClick,
    isFormationLoading,
  };
}
