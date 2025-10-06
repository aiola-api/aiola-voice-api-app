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

      // Log every 100th frame to verify audio is being captured
      this.frameCount++;
      if (this.frameCount % 100 === 0) {
        console.log(
          `🎙️ Audio frame ${this.frameCount}: ${pcmData.length} samples`
        );
      }

      // Send the audio data to the main thread
      this.port.postMessage({
        audio_data: pcmData.buffer,
      });
    }

    return true; // Keep processor alive
  }
}

registerProcessor("audio-processor", AudioProcessor);
