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
 * Linear interpolation between two values
 */
function lerp(start, end, t) {
  return start + (end - start) * t;
}

/**
 * Parse hex color to RGB object
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB object to hex color
 */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
}

/**
 * Interpolate between two colors
 */
function interpolateColor(color1, color2, t) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return color1;

  const r = lerp(rgb1.r, rgb2.r, t);
  const g = lerp(rgb1.g, rgb2.g, t);
  const b = lerp(rgb1.b, rgb2.b, t);

  return rgbToHex(r, g, b);
}

/**
 * Interpolate between multiple colors based on a value
 */
function multiColorInterpolate(value, stops) {
  if (value <= stops[0].position) return stops[0].color;
  if (value >= stops[stops.length - 1].position) return stops[stops.length - 1].color;

  for (let i = 0; i < stops.length - 1; i++) {
    if (value >= stops[i].position && value <= stops[i + 1].position) {
      const t = (value - stops[i].position) / (stops[i + 1].position - stops[i].position);
      return interpolateColor(stops[i].color, stops[i + 1].color, t);
    }
  }

  return stops[0].color;
}

/**
 * Interpolate between dark and bright colors
 * value: 0 darkest, to 1 brightest
 */
function interpolateColorPalette(value) {
  // Define color palette from dark to bright using blue tones
  const stops = [
    { position: 0, color: '#0A1929' },
    { position: 0.25, color: '#1E3A5F' },
    { position: 0.5, color: '#4A7BA7' },
    { position: 0.75, color: '#7FA8D1' },
    { position: 1, color: '#B8D4F1' },
  ];

  return multiColorInterpolate(value, stops);
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

  sequenceData.notes.forEach((note) => {
    const noteClass = keysLookup[note.pitch % 12];
    const index = qc.findLastIndex((v) => v === noteClass) - 6;

    // Weight by note duration
    const duration = parseInt(note.quantizedEndStep) - parseInt(note.quantizedStartStep);

    // Index ranges from -6 darkest to +6 brightest
    brightnessSum += index * duration;
    totalWeight += duration;
  });

  const avgBrightness = totalWeight > 0 ? brightnessSum / totalWeight : 0;

  // Normalize to 0-1 range
  const normalizedBrightness = (avgBrightness + 6) / 12;

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
