import * as mm from '@magenta/music';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

export class MagentaService {
  constructor() {
    this.model = null;
    this.modelUrl =
      'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_med_q2';
  }

  async initializeModel() {
    if (!this.model) {
      this.model = new mm.MusicVAE(this.modelUrl);
      await this.model.initialize();
    }
    return this.model;
  }

  quantizeSequence(sequenceData, stepsPerQuarter = 4) {
    if (!sequenceData.quantizationInfo) {
      return mm.sequences.quantizeNoteSequence(sequenceData, stepsPerQuarter);
    }
    return sequenceData;
  }

  // Wrap heavy computation in requestIdleCallback to avoid blocking audio
  async runAsync(fn) {
    return new Promise((resolve) => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(async () => {
          const result = await fn();
          resolve(result);
        });
      } else {
        // Fallback
        setTimeout(async () => {
          const result = await fn();
          resolve(result);
        }, 0);
      }
    });
  }

  async sampleSequences(count = 1, temperature = 0.5, stepsPerQuarter = 4, qpm = 120) {
    await this.initializeModel();

    return this.runAsync(async () => {
      const samples = await this.model.sample(count, temperature, undefined, stepsPerQuarter, qpm);
      return samples.map((sequence) => {
        const quantized = this.quantizeSequence(sequence, stepsPerQuarter);
        quantized.totalQuantizedSteps = 64;
        quantized.notes = quantized.notes.filter(
          (n) => n.quantizedStartStep < 64 && n.quantizedEndStep <= 64
        );
        return quantized;
      });
    });
  }

  async interpolateSequences(sequences, numInterpolations) {
    await this.initializeModel();

    return this.runAsync(async () => {
      const quantized = sequences.map(this.quantizeSequence);
      return await this.model.interpolate(quantized, numInterpolations);
    });
  }

  async bilinearInterpolate(sequences, dimensions, temperature = 0.5) {
    await this.initializeModel();

    return this.runAsync(async () => {
      const quantized = sequences.map(this.quantizeSequence);
      return await this.model.interpolate(quantized, dimensions, temperature);
    });
  }

  async generateSimilarSequences(sequenceData, count = 3, temperature = 0.75) {
    await this.initializeModel();

    return this.runAsync(async () => {
      const quantized = this.quantizeSequence(sequenceData);
      quantized.totalQuantizedSteps = 64;
      quantized.notes = quantized.notes.filter(
        (n) => n.quantizedStartStep < 64 && n.quantizedEndStep <= 64
      );
      return await this.model.similar(quantized, count, temperature);
    });
  }

  /*
  async generateSimilarSequences(sequenceData, count = 3, temperature = 0.75) {
    await this.initializeModel();

    try {
      const quantizedSequence = this.quantizeSequence(sequenceData);
      quantizedSequence.totalQuantizedSteps = 64;
      quantizedSequence.notes = quantizedSequence.notes.filter(
        (n) => n.quantizedStartStep < 64 && n.quantizedEndStep <= 64
      );

      return await this.model.similar(quantizedSequence, count, temperature);
    } catch (e) {
      console.warn('Could not generate similar sequences:', e);
      return Array(count).fill(sequenceData);
    }
  }

  async sampleSequences(count = 1, temperature = 0.5, stepsPerQuarter = 4, qpm = 120) {
    await this.initializeModel();

    try {
      const samples = await this.model.sample(count, temperature, undefined, stepsPerQuarter, qpm);
      return samples.map((sequence) => {
        const quantized = this.quantizeSequence(sequence, stepsPerQuarter);
        quantized.totalQuantizedSteps = 64;
        quantized.notes = quantized.notes.filter(
          (n) => n.quantizedStartStep < 64 && n.quantizedEndStep <= 64
        );
        return quantized;
      });
    } catch (e) {
      console.warn('Could not sample sequences from MusicVAE:', e);
      return [];
    }
  }

  async interpolateSequences(sequences, numInterpolations) {
    await this.initializeModel();

    const quantizedSequences = sequences.map((seq) => this.quantizeSequence(seq));
    return await this.model.interpolate(quantizedSequences, numInterpolations);
  }

  async bilinearInterpolate(sequences, dimensions) {
    await this.initializeModel();

    const quantizedSequences = sequences.map((seq) => this.quantizeSequence(seq));
    return await this.model.interpolate(quantizedSequences, dimensions, 0.5);
  }
  */


}
