

/**
 * Decodes a base64 string into a Uint8Array.
 * @param base64 The base64 encoded string.
 * @returns A Uint8Array containing the decoded binary data.
 */
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encodes a Uint8Array into a base64 string.
 * @param bytes The Uint8Array to encode.
 * @returns A base64 encoded string.
 */
export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes raw PCM audio data (Uint8Array) into an AudioBuffer.
 * This function handles 16-bit PCM data which is common from the Live API.
 * @param data The Uint8Array containing the raw PCM audio data.
 * @param ctx The AudioContext to create the AudioBuffer.
 * @param sampleRate The sample rate of the audio data.
 * @param numChannels The number of channels in the audio data (e.g., 1 for mono).
 * @returns A Promise that resolves to an AudioBuffer.
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // Convert Uint8Array to Int16Array (assuming 16-bit PCM)
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;

  // Create an empty AudioBuffer
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  // Fill the AudioBuffer with normalized floating-point data
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Normalize 16-bit integer to float between -1.0 and 1.0
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Converts an AudioBuffer into a WAV audio Blob.
 * This is useful for playing audio in HTML <audio> tags or for download.
 * @param audioBuffer The AudioBuffer to convert.
 * @returns A Blob containing the WAV audio data.
 */
export function audioBufferToWaveBlob(audioBuffer: AudioBuffer): Blob {
  const numOfChan = audioBuffer.numberOfChannels;
  const length = audioBuffer.length * numOfChan * 2 + 44; // +44 for WAV header
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  const format = 1; // PCM
  const sampleRate = audioBuffer.sampleRate;
  const byteRate = sampleRate * numOfChan * 2; // 2 bytes per sample (16-bit)
  const blockAlign = numOfChan * 2;
  const bitsPerSample = 16;
  let offset = 0;

  /* Writes a string to the DataView */
  const writeString = (view: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  /* RIFF identifier */
  writeString(view, offset, 'RIFF'); offset += 4;
  /* file length */
  view.setUint32(offset, length - 8, true); offset += 4;
  /* RIFF type */
  writeString(view, offset, 'WAVE'); offset += 4;
  /* format chunk identifier */
  writeString(view, offset, 'fmt '); offset += 4;
  /* format chunk length */
  view.setUint32(offset, 16, true); offset += 4;
  /* sample format (raw) */
  view.setUint16(offset, format, true); offset += 2;
  /* channel count */
  view.setUint16(offset, numOfChan, true); offset += 2;
  /* sample rate */
  view.setUint32(offset, sampleRate, true); offset += 4;
  /* byte rate (sample rate * block align) */
  view.setUint32(offset, byteRate, true); offset += 4;
  /* block align (channel count * bytes per sample) */
  view.setUint16(offset, blockAlign, true); offset += 2;
  /* bits per sample */
  view.setUint16(offset, bitsPerSample, true); offset += 2;
  /* data chunk identifier */
  writeString(view, offset, 'data'); offset += 4;
  /* data chunk length */
  view.setUint32(offset, length - offset - 4, true); offset += 4;

  // Write PCM data
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let channel = 0; channel < numOfChan; channel++) {
      const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
      // Convert float to 16-bit PCM
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}