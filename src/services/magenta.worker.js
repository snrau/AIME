import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as mm from '@magenta/music';

await tf.setBackend('webgl');
await tf.ready();


let model = null;
const modelUrl =
  'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_med_q2';

async function initializeModel() {
  if (!model) {
    model = new mm.MusicVAE(modelUrl);
    await model.initialize();
    console.log('[MagentaWorker] Model initialized');
  }
}

function quantizeSequence(sequenceData, stepsPerQuarter = 4) {
  if (!sequenceData.quantizationInfo) {
    return mm.sequences.quantizeNoteSequence(sequenceData, stepsPerQuarter);
  }
  return sequenceData;
}

console.log('WORKER BOOTED');

self.onmessage = async (event) => {
  const { id, type, payload } = event.data;

  console.log('onmessage')

  try {
    await initializeModel();

    let result;

    switch (type) {
      case 'INTERPOLATE': {
        const { sequences, numInterpolations } = payload;
        const quantized = sequences.map(quantizeSequence);
        result = await model.interpolate(quantized, numInterpolations);
        break;
      }

      case 'BILINEAR_INTERPOLATE': {
        const { sequences, dimensions, temperature = 0.5 } = payload;
        const quantized = sequences.map(quantizeSequence);
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

        result = await model.similar(q, count, temperature);
        break;
      }

      default:
        throw new Error(`Unknown worker task: ${type}`);
    }

    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};
