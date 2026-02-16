import * as mm from '@magenta/music';

export class MagentaWorkerClient {
  constructor() {
    this.worker = new Worker(new URL('./worker.js', import.meta.url))//, { type: 'module' }); //new URL('magenta.worker.js', import.meta.url)

    console.log('[MagentaClient] initialized');

    this.callbacks = new Map();

    this.worker.onmessage = (e) => {
      const { id, result, error } = e.data;
      const cb = this.callbacks.get(id);

      if (!cb) return;

      error ? cb.reject(error) : cb.resolve(result);
      this.callbacks.delete(id);
    };

    this.worker.onerror = (e) => {
      console.error('Worker error:', e.message, e);
    };
  }

  call(type, payload, timeout = 10000) {
    const id = crypto.randomUUID();

    console.log(`[MagentaClient] call: ${type}`, payload);

    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.worker.postMessage({ id, type, payload });

      const timer = setTimeout(() => {
        this.callbacks.delete(id);
        reject(new Error(`Worker call timed out: ${type}`));
      }, timeout);
    });

  }

  interpolateSequences(oldsequences, numInterpolations) {
    const sequences = this.copySequences(oldsequences);
    return this.call('INTERPOLATE', { sequences, numInterpolations });
  }

  bilinearInterpolate(oldsequences, dimensions, temperature = 0.5) {
    const sequences = this.copySequences(oldsequences);
    return this.call('BILINEAR_INTERPOLATE', {
      sequences,
      dimensions,
      temperature,
    });
  }

  sampleSequences(count, temperature, stepsPerQuarter, qpm) {
    return this.call('SAMPLE', {
      count,
      temperature,
      stepsPerQuarter,
      qpm,
    });
  }

  generateSimilarSequences(oldsequence, count, temperature) {
    const sequence = this.copySequence(oldsequence);
    return this.call('SIMILAR', {
      sequence,
      count,
      temperature,
    });
  }

  copySequence(seq) {
    let newseq = mm.sequences.createQuantizedNoteSequence(4, 120);
    newseq.totalQuantizedSteps = seq.totalQuantizedSteps;
    newseq.notes = seq.notes.map(n => {
      return {
        pitch: n.pitch,
        quantizedStartStep: n.quantizedStartStep,
        quantizedEndStep: n.quantizedEndStep,
      }
    })
    return newseq;
  }

  copySequences(sequences) {
    return sequences.map(this.copySequence);
  }
}
