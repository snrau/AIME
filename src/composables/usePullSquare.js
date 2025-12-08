export function usePullSquare(
  getSquareAtPosition,
  removeSquares,
  cols,
  rows,
  placeSquare,
  magentaService,
  updateSquare,
  isBatchOperation
) {
  const handlePullSquare = async ({ x, y, direction, sequenceData, pullStrength = 3 }) => {
    // Find target square in the specified direction
    let targetSquare = null;

    // to check if there is space for creating new squares
    let hasSpaceForPull = true;

    // Search for adjacent square in the target direction
    switch (direction) {
      case 'left':
        // Looking for a square to the left
        targetSquare = getSquareAtPosition(x - 1, y);
        if (getSquareAtPosition(x + 1, y)) hasSpaceForPull = false;
        break;
      case 'right':
        // Looking for a square to the right
        targetSquare = getSquareAtPosition(x + 1, y);
        if (getSquareAtPosition(x - 1, y)) hasSpaceForPull = false;
        break;
      case 'up':
        // Looking for a square above
        targetSquare = getSquareAtPosition(x, y - 1);
        if (getSquareAtPosition(x, y + 1)) hasSpaceForPull = false;
        break;
      case 'down':
        // Looking for a square below
        targetSquare = getSquareAtPosition(x, y + 1);
        if (getSquareAtPosition(x, y - 1)) hasSpaceForPull = false;
        break;
    }

    if (targetSquare && hasSpaceForPull) {
      // Identify the original source square
      const sourceSquare = getSquareAtPosition(x, y);
      if (!sourceSquare) {
        console.error('Source square not found, cannot proceed with pull operation');
        if (isBatchOperation) {
          isBatchOperation.value = false;
        }
        return;
      }

      if (!sequenceData || !targetSquare.sequenceData) {
        if (isBatchOperation) {
          isBatchOperation.value = false;
        }
        return;
      }

      // Store original positions
      const sourceX = sourceSquare.x;
      const sourceY = sourceSquare.y;
      const targetX = targetSquare.x;
      const targetY = targetSquare.y;

      // Remove original squares temporarily
      removeSquares([
        { x: sourceX, y: sourceY },
        { x: targetX, y: targetY },
      ]);

      // Calculate the new positions for source and target squares, for moving them apart in opposite directions
      let newSourceX = sourceX;
      let newSourceY = sourceY;
      let newTargetX = targetX;
      let newTargetY = targetY;

      // Each square moves pull strength in opposite directions
      const moveDistance = pullStrength || 3;

      switch (direction) {
        case 'left':
          // Source moves right, target moves left
          newSourceX = sourceX + moveDistance;
          newTargetX = targetX - moveDistance;
          break;
        case 'right':
          // Source moves left, target moves right
          newSourceX = sourceX - moveDistance;
          newTargetX = targetX + moveDistance;
          break;
        case 'up':
          // Source moves down, target moves up
          newSourceY = sourceY + moveDistance;
          newTargetY = targetY - moveDistance;
          break;
        case 'down':
          // Source moves up, target moves down
          newSourceY = sourceY - moveDistance;
          newTargetY = targetY + moveDistance;
          break;
      }

      // Make sure new positions are within grid bounds
      newSourceX = Math.max(0, Math.min(cols - 1, newSourceX));
      newSourceY = Math.max(0, Math.min(rows - 1, newSourceY));
      newTargetX = Math.max(0, Math.min(cols - 1, newTargetX));
      newTargetY = Math.max(0, Math.min(rows - 1, newTargetY));

      // Place source and target squares at their new positions with their corresponding sequence data
      placeSquare(newSourceX, newSourceY, sequenceData);
      placeSquare(newTargetX, newTargetY, targetSquare.sequenceData);

      // Calculate positions for new squares
      let newSquarePositions = [];

      if (direction === 'left' || direction === 'right') {
        // For horizontal pulling, create squares in a straight line
        const startX = Math.min(newSourceX, newTargetX);
        const endX = Math.max(newSourceX, newTargetX);

        for (let i = startX + 1; i < endX; i++) {
          newSquarePositions.push({ x: i, y: sourceY });
        }
      } else {
        // For vertical pulling, create squares in a straight line
        const startY = Math.min(newSourceY, newTargetY);
        const endY = Math.max(newSourceY, newTargetY);

        for (let i = startY + 1; i < endY; i++) {
          newSquarePositions.push({ x: sourceX, y: i });
        }
      }

      // Generate interpolated sequences for the in-between squares
      try {
        // Ensure sequences are quantized
        let sourceSequenceData = sequenceData;
        let targetSequenceData = targetSquare.sequenceData;

        if (sourceSequenceData && !sourceSequenceData.quantizationInfo) {
          sourceSequenceData = magentaService.quantizeSequence(sourceSequenceData, 4);
        }

        if (targetSequenceData && !targetSequenceData.quantizationInfo) {
          targetSequenceData = magentaService.quantizeSequence(targetSequenceData, 4);
        }

        // Calculate how many interpolations we need, +2 for source and target
        const numInterpolations = newSquarePositions.length + 2;

        if (numInterpolations > 2) {
          // Place new squares between the moved squares with their interpolated sequences
          for (let i = 0; i < newSquarePositions.length; i++) {
            const pos = newSquarePositions[i];
            placeSquare(pos.x, pos.y, null, true);
          }

          // Determine the correct order of sequences based on spatial arrangement
          let firstSequence, lastSequence;
          let sequencesInOrder;

          if (direction === 'left' || direction === 'right') {
            // For horizontal: check which square is leftmost
            if (newSourceX < newTargetX) {
              // Source is left, target is right
              firstSequence = sourceSequenceData;
              lastSequence = targetSequenceData;
            } else {
              // Target is left, source is right
              firstSequence = targetSequenceData;
              lastSequence = sourceSequenceData;
            }
          } else {
            // For vertical: check which square is topmost
            if (newSourceY < newTargetY) {
              // Source is up, target is down
              firstSequence = sourceSequenceData;
              lastSequence = targetSequenceData;
            } else {
              // Target is up, source is down
              firstSequence = targetSequenceData;
              lastSequence = sourceSequenceData;
            }
          }

          sequencesInOrder = [firstSequence, lastSequence];

          // Generate interpolations between the two sequences in correct spatial order
          const interpolatedSequences = await magentaService.interpolateSequences(
            sequencesInOrder,
            numInterpolations
          );

          // Update each square with its interpolated sequence
          for (let i = 0; i < newSquarePositions.length; i++) {
            const pos = newSquarePositions[i];
            updateSquare(pos.x, pos.y, interpolatedSequences[i + 1], false);
          }
        }
      } catch (e) {
        console.warn('Error generating interpolated sequences:', e);
      }

      // End batch operation and trigger a single save
      if (isBatchOperation) {
        isBatchOperation.value = false;
      }
    } else if (targetSquare && !hasSpaceForPull) {
      // Target square exists but no space for pull, then do nothing
      if (isBatchOperation) {
        isBatchOperation.value = false;
      }
    } else if (!targetSquare) {
      // No adjacent target square, just move the single square
      const sourceSquare = getSquareAtPosition(x, y);
      if (!sourceSquare) {
        if (isBatchOperation) {
          isBatchOperation.value = false;
        }
        return;
      }

      // Calculate new position based on direction, mirrored
      let newX = x;
      let newY = y;
      const moveDistance = pullStrength || 3;

      switch (direction) {
        case 'left':
          newX = x + moveDistance;
          break;
        case 'right':
          newX = x - moveDistance;
          break;
        case 'up':
          newY = y + moveDistance;
          break;
        case 'down':
          newY = y - moveDistance;
          break;
      }

      // Make sure new position is within grid bounds
      newX = Math.max(0, Math.min(cols - 1, newX));
      newY = Math.max(0, Math.min(rows - 1, newY));

      // Only move if the new position is different and not occupied
      if ((newX !== x || newY !== y) && !getSquareAtPosition(newX, newY)) {
        removeSquares([{ x, y }]);
        placeSquare(newX, newY, sourceSquare.sequenceData);
      }

      if (isBatchOperation) {
        isBatchOperation.value = false;
      }
    }
  };

  return { handlePullSquare };
}
