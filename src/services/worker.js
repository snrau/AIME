//import * as tf from '@tensorflow/tfjs';
//import '@tensorflow/tfjs-backend-webgl';
//import * as mm from '../../libs/magenta-music/esm/index.js';

//await tf.setBackend('webgl');
//await tf.ready();

importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@2.7.0/dist/tf.min.js");
importScripts("https://cdn.jsdelivr.net/npm/@magenta/music@^1.23.1/es6/core.js");
importScripts("https://cdn.jsdelivr.net/npm/@magenta/music@^1.23.1/es6/music_vae.js");

console.log('[MagentaWorker] BOOTED');

const modelUrl =
  'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_med_q2';

const model = new music_vae.MusicVAE(modelUrl);

model.initialize();

console.log('[MagentaWorker] Model initialized');

async function initializeModel() {
  if (!model) {
    await model.initialize();
    console.log('[MagentaWorker] Model initialized');
  }
}



self.onmessage = async (event) => {
  const { id, type, payload } = event.data;

  console.log('onmessage', id, type, payload);

  try {
    await initializeModel();

    let result;

    switch (type) {
      case 'INTERPOLATE': {
        const { sequences, numInterpolations } = payload;
        const quantized = sequences.map(quantizeSequence);
        console.log("await interpolate", numInterpolations)
        result = await model.interpolate(quantized, numInterpolations);
        break;
      }

      case 'BILINEAR_INTERPOLATE': {
        const { sequences, dimensions, temperature = 0.5 } = payload;
        const quantized = sequences.map(quantizeSequence);
        console.log("await bilinear interpolate")
        result = await model.interpolate(quantized, dimensions, temperature);
        break;
      }

      case 'SAMPLE': {
        const { count, temperature, stepsPerQuarter, qpm } = payload;
        const samples = await model.sample(
          count,
          temperature,
          undefined,
          stepsPerQuarter,
          qpm
        );

        result = samples.map((seq) => {
          const q = quantizeSequence(seq, stepsPerQuarter);
          q.totalQuantizedSteps = 64;
          q.notes = q.notes.filter(
            (n) => n.quantizedStartStep < 64 && n.quantizedEndStep <= 64
          );
          return q;
        });
        break;
      }

      case 'SIMILAR': {
        const { sequence, count, temperature } = payload;
        const q = quantizeSequence(sequence);
        q.totalQuantizedSteps = 64;
        q.notes = q.notes.filter(
          (n) => n.quantizedStartStep < 64 && n.quantizedEndStep <= 64
        );
        console.log("await similar")

        result = await model.similar(q, count, temperature);
        break;
      }

      default:
        throw new Error(`Unknown worker task: ${type}`);
    }

    console.log('[Worker] result', type, result);
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};

function quantizeSequence(sequenceData, stepsPerQuarter = 4) {
  if (!sequenceData.quantizationInfo) {
    return core.quantizeNoteSequence(sequenceData, stepsPerQuarter);
  }
  return sequenceData;
}

