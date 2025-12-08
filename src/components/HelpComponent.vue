<script setup></script>
<template>
  <div class="help-content">
    <h1>How to Use</h1>

    <section>
      <h2>Getting Started</h2>
      <ol>
        <li>
          <strong>Create Your First Sequence:</strong> Click on the square in the middle of the grid
          to open the drawing component. Draw a note sequence using the piano roll and save it.
        </li>
        <li>
          <strong>Generate Similar Melodies:</strong> Once saved, 3 additional squares will be
          automatically generated with similar melodies.
        </li>
      </ol>
    </section>

    <section>
      <h2>Piano Roll Editor</h2>
      <p>Click on any square to open the drawing component, which includes:</p>
      <ul>
        <li><strong>Piano Roll:</strong> Draw and edit your note sequence</li>
        <li><strong>Playback:</strong> Play the sequence to hear it</li>
        <li>
          <strong>Random Generation:</strong> Click the dice button to generate a random note
          sequence as a starting point
        </li>
        <li><strong>Controls:</strong> Save, reset, or close the editor</li>
        <li>
          <strong>Note:</strong> Interpolated sequences will also appear here and can be further
          edited
        </li>
      </ul>
    </section>

    <section>
      <h2>Working with Squares</h2>
      <h3>Moving & Interpolating</h3>
      <ul>
        <li>
          <strong>Interpolate:</strong> Pull on a square to interpolate between melodies. If an
          interpolation partner is found, interpolation will be performed. If none is found, the
          square is simply moved.
        </li>
        <li>
          <strong>Valid Positions:</strong> Green highlighting shows where a square can be moved.
        </li>
      </ul>

      <h3>Creating New Squares</h3>
      <ul>
        <li>
          Ensure the <strong>Create mode</strong> is toggled on (default setting, located above
          buffer 2).
        </li>
        <li>Click on an empty position in the grid.</li>
        <li>Add a note sequence to make the square usable for interpolation.</li>
      </ul>

      <h3>Removing Squares</h3>
      <ul>
        <li>Toggle the slider above buffer 2 into <strong>Remove mode</strong>.</li>
        <li>Click on any square to remove it from the grid.</li>
        <li>
          <strong>Note:</strong> In Remove mode, dragging squares still works for moving/copying.
        </li>
      </ul>
    </section>

    <section>
      <h2>Drawing a Melody</h2>
      <ol>
        <li>
          <strong>Activate Drawing Mode:</strong> Toggle the drawing mode switch located next to the
          create mode switch above the copy slider.
        </li>
        <li>
          <strong>Draw a Line:</strong> Click and drag to draw a line above the squares in your room
          grid.
        </li>
        <li>
          <strong>Melody Sequence:</strong> All squares that the line passes through will be added
          to the melody, in the order the line crosses them.
        </li>
        <li>
          <strong>Playback:</strong> Use the play button in the melody container to listen to the
          created melody.
        </li>
      </ol>
    </section>

    <section>
      <h2>Saving & Loading</h2>
      <ul>
        <li>
          <strong>Save Room:</strong> Use the save button in the top left corner of the header to
          save your current workspace.
        </li>
        <li>
          <strong>Load Rooms:</strong> Access saved rooms through the rooms window, which can be
          opened from the header next to the save button.
        </li>
      </ul>
    </section>

    <section>
      <h2>Tonal Colors</h2>
      <p>
        Squares are colored based on whether their average tone is bright or dark relative to the
        selected tonic tone.
      </p>
      <ul>
        <li>
          <strong>Change Tonic:</strong> Use the Circle of Fifths in the header (next to the room
          selection button) to select different tonic tones.
        </li>
      </ul>
    </section>
  </div>
</template>
<style scoped>
.help-content {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.3;
  height: 50vh;
  overflow-y: scroll;
}

.help-content h1 {
  font-size: 26px;
  margin-bottom: 1.5rem;
  color: var(--color-heading, #ffffff);
  border-bottom: 2px solid var(--color-border, #ffffff);
  padding-bottom: 0.5rem;
}

.help-content h2 {
  font-size: 1.5rem;
  margin-top: 2rem;
  margin-bottom: 1rem;
  color: var(--color-heading, #ffffff);
}

.help-content h3 {
  font-size: 1.2rem;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  color: var(--color-heading, #ffffff);
}

.help-content section {
  margin-bottom: 2rem;
}

.help-content ol,
.help-content ul {
  margin-left: 1.5rem;
  margin-bottom: 1rem;
}

.help-content li {
  margin-bottom: 0.75rem;
}

.help-content strong {
  color: var(--color-text-strong, #ffffff);
  font-weight: 600;
}

.help-content p {
  margin-bottom: 0.75rem;
}
</style>
