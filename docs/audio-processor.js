class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frameCount = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const inputChannel = input[0];

      // Convert Float32Array to Int16Array (PCM 16-bit)
      const pcmData = new Int16Array(inputChannel.length);
      for (let i = 0; i < inputChannel.length; i++) {
        // Clamp the value between -1 and 1, then convert to 16-bit integer
        const s = Math.max(-1, Math.min(1, inputChannel[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      // Calculate amplitude levels for waveform visualization
      const amplitudeData = this.calculateAmplitude(inputChannel);

      // Log every 100th frame to verify audio is being captured
      this.frameCount++;
      if (this.frameCount % 100 === 0) {
        console.log(
          `🎙️ Audio frame ${this.frameCount}: ${
            pcmData.length
          } samples, amplitude: ${amplitudeData.average.toFixed(3)}`
        );
      }

      // Send both audio data and amplitude data to the main thread
      this.port.postMessage({
        audio_data: pcmData.buffer,
        amplitude: amplitudeData,
      });
    }

    return true; // Keep processor alive
  }

  /**
   * Calculate amplitude levels from audio input
   * @param {Float32Array} inputChannel - Raw audio input channel
   * @returns {Object} Amplitude data with average, peak, and RMS values
   */
  calculateAmplitude(inputChannel) {
    let sum = 0;
    let peak = 0;
    let rmsSum = 0;

    // Process every 4th sample for performance (reduce from ~44kHz to ~11kHz for amplitude calculation)
    const step = 4;
    for (let i = 0; i < inputChannel.length; i += step) {
      const sample = Math.abs(inputChannel[i]);
      sum += sample;
      peak = Math.max(peak, sample);
      rmsSum += sample * sample;
    }

    const sampleCount = Math.floor(inputChannel.length / step);
    const average = sampleCount > 0 ? sum / sampleCount : 0;
    const rms = Math.sqrt(rmsSum / sampleCount);

    return {
      average: average,
      peak: peak,
      rms: rms,
      normalizedAverage: Math.min(1, average * 5), // Normalize for visualization (boost quieter sounds)
      normalizedPeak: Math.min(1, peak * 4),
      normalizedRms: Math.min(1, rms * 5),
    };
  }
}

registerProcessor("audio-processor", AudioProcessor);
