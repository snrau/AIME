import * as mm from '@magenta/music';

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
}
