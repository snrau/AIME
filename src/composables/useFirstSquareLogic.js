export function useFirstSquareLogic(placeSquare, grid, magentaService, updateSquare) {
  const handleFirstSquareSequenceGenerated = async (sequenceData) => {
    // Check if sequence has actual notes
    if (!sequenceData || !sequenceData.notes || sequenceData.notes.length === 0) {
      console.log('No notes in sequence, skipping first square logic');
      return;
    }

    // Only proceed if only the first one exists
    if (grid.value.length === 1) {
      const firstSquare = grid.value[0];
      // Use updateSquare to trigger reactivity
      updateSquare(firstSquare.x, firstSquare.y, sequenceData);
      const firstX = firstSquare.x;
      const firstY = firstSquare.y;

      // Quantize the sequence to 16th notes (stepsPerQuarter=4)
      let quantizedSequence = sequenceData;
      try {
        if (!sequenceData.quantizationInfo) {
          quantizedSequence = magentaService.quantizeSequence(sequenceData, 4);
        }
        // Truncate or pad to exactly 64 steps
        quantizedSequence.totalQuantizedSteps = 64;
        // Optionally, filter notes outside 0-63
        quantizedSequence.notes = quantizedSequence.notes.filter(function (n) {
          return n.quantizedStartStep < 64 && n.quantizedEndStep <= 64;
        });
      } catch (e) {
        console.warn('Could not quantize sequence, using original:', e);
        quantizedSequence = sequenceData;
      }

      // Generate 3 similar sequences
      let similarSequences = [];
      try {
        similarSequences = await magentaService.generateSimilarSequences(
          quantizedSequence,
          3,
          0.75
        );
      } catch (e) {
        console.warn('Could not generate similar sequences, using original:', e);
        similarSequences = [quantizedSequence, quantizedSequence, quantizedSequence];
      }

      // Place 3 additional squares, each with a different similar sequence
      placeSquare(firstX - 1, firstY, similarSequences[0]);
      placeSquare(firstX - 1, firstY + 1, similarSequences[1]);
      placeSquare(firstX, firstY + 1, similarSequences[2]);
    }
  };

  return { handleFirstSquareSequenceGenerated };
}
