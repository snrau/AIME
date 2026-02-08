import { interpolateViridis } from 'd3-scale-chromatic';

// Keys lookup: index to note name
export const keysLookup = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Circle of fifths
export const quintcircle = [
  { dur: 'C', moll: 'A' },
  { dur: 'G', moll: 'E' },
  { dur: 'D', moll: 'B' },
  { dur: 'A', moll: 'F#' },
  { dur: 'E', moll: 'C#' },
  { dur: 'B', moll: 'G#' },
  { dur: 'F#', moll: 'D#' },
  { dur: 'C#', moll: 'A#' },
  { dur: 'G#', moll: 'F' },
  { dur: 'D#', moll: 'C' },
  { dur: 'A#', moll: 'G' },
  { dur: 'F', moll: 'D' },
];

/**
 * Normalize circle of fifths key names to match keysLookup format
 */
function normalizeKeyName(key) {
  const mapping = {
    'F♯/G♭': 'F#',
    'D♭': 'C#',
    'A♭': 'G#',
    'E♭': 'D#',
    'B♭': 'A#',
  };
  return mapping[key] || key;
}

/**
 * Reshuffle the circle of fifths to center around a base note
 * Returns array with base note at center (index 6)
 */
export function reshuffleQuintCircle(baseNote, mode = 'dur') {
  const quintcirclers = quintcircle.map((m) => (mode === 'dur' ? m.dur : m.moll));

  const normalizedBase = normalizeKeyName(baseNote);
  const quints = [...quintcirclers];
  let index = quints.indexOf(normalizedBase) - 6;

  while (index !== 0) {
    quints.push(quints.shift());
    index = quints.indexOf(normalizedBase) - 6;
  }

  return quints;
}

/**
 * Determine if a pitch is bright or dark relative to tonic
 * Returns:
 * - true for bright tone
 * - false for dark tone
 * - 0 for tonic itself
 * - -6 for tritone, which is furthest from tonic
 */
export function isBright(pitch, baseKey) {
  const qc = reshuffleQuintCircle(baseKey, 'dur');
  const note = keysLookup[pitch % 12];
  const index = qc.findLastIndex((v) => v === note) - 6;

  if (index > 0) return true;
  else if (index === -6) return -6;
  else if (index === 0) return 0;
  else return false;
}

/**
 * Interpolate between dark and bright colors using D3's Viridis color scheme
 * with enhanced sensitivity to emphasize tonal differences
 * value: 0 darkest, to 1 brightest
 */
function interpolateColorPalette(value) {
  // Clamp value between 0 and 1
  const clampedValue = Math.max(0, Math.min(1, value));

  const sensitivityFactor = 1.8;
  const sensitiveValue = Math.pow(clampedValue, sensitivityFactor);

  return interpolateViridis(sensitiveValue);
}

/**
 * Calculate color based on sequence notes and tonic key
 * Interpolates between dark and bright colors based on average brightness
 */
export function calculateTonicBasedColor(sequenceData, tonicKey) {
  if (!sequenceData || !sequenceData.notes || sequenceData.notes.length === 0) {
    return null; // null for squares without notes
  }

  const normalizedTonic = normalizeKeyName(tonicKey);
  const qc = reshuffleQuintCircle(normalizedTonic, 'dur');

  // Calculate brightness score for each note
  let brightnessSum = 0;
  let totalWeight = 0;
  let hardcase = 0;

  sequenceData.notes.forEach((note) => {
    const noteClass = keysLookup[note.pitch % 12];
    const index = qc.findLastIndex((v) => v === noteClass) - 6;

    // Weight by note duration
    const duration = parseInt(note.quantizedEndStep) - parseInt(note.quantizedStartStep);

    // Index ranges from -6 darkest to +6 brightest
    //brightnessSum += index * duration;
    if (index !== 0) {
      if (index === -6) hardcase += duration;
      else brightnessSum += index > 0 ? duration : index < 0 ? -duration : 0;
      totalWeight += duration;
    }
  });

  brightnessSum += brightnessSum > 0 ? hardcase : brightnessSum < 0 ? -hardcase : 0;

  // Normalize to 0-1 range
  const normalizedBrightness =
    totalWeight > 0 ? (brightnessSum + totalWeight) / (2 * totalWeight) : 0.5;

  console.log(sequenceData, brightnessSum, totalWeight, normalizedBrightness);

  return interpolateColorPalette(normalizedBrightness);
}

/**
 * Calculate weighted timbre for a melody
 * Returns value from 0 dark to 1 bright
 */
export function calcWeightedTimbre(melody, basenote, qc) {
  if (basenote === -1 || qc === undefined) {
    return { timbre: undefined, timbrescore: 0 };
  }

  let timbre = 0;
  let timbrescore = 0;
  let hardcase = 0;
  let total = 0;

  melody.notes.forEach((n) => {
    const note = keysLookup[n.pitch % 12];
    const length = parseInt(n.quantizedEndStep) - parseInt(n.quantizedStartStep);
    const index = qc.findLastIndex((v) => v === note) - 6;

    if (index !== 0) {
      if (index === -6) hardcase += length;
      else timbre += index > 0 ? length : index < 0 ? -length : 0;
      timbrescore += index;
      total += length;
    }
  });

  timbre += timbre > 0 ? hardcase : timbre < 0 ? -hardcase : 0;

  // Map timbre from [-total, total] to [0, 1]
  const normalizedTimbre = total > 0 ? (timbre + total) / (2 * total) : 0.5;

  return { timbre: normalizedTimbre, timbrescore: timbrescore / melody.notes.length };
}
