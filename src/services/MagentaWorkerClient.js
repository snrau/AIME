export class MagentaWorkerClient {
  constructor() {
    this.worker = new Worker(new URL('./magenta.worker.js', import.meta.url), { type: 'module' });

    console.log('[MagentaWorker] loaded');

    this.callbacks = new Map();

    this.worker.onmessage = (e) => {
      const { id, result, error } = e.data;
      const cb = this.callbacks.get(id);

      if (!cb) return;

      error ? cb.reject(error) : cb.resolve(result);
      this.callbacks.delete(id);
    };
  }

  call(type, payload) {
    const id = crypto.randomUUID();

    console.log(`[MagentaWorker] call: ${type}`, payload);

    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.worker.postMessage({ id, type, payload });
    });
  }

  interpolateSequences(sequences, numInterpolations) {
    return this.call('INTERPOLATE', { sequences, numInterpolations });
  }

  bilinearInterpolate(sequences, dimensions, temperature = 0.5) {
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

  generateSimilarSequences(sequence, count, temperature) {
    return this.call('SIMILAR', {
      sequence,
      count,
      temperature,
    });
  }
}
