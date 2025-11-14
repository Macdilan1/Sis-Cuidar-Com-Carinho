/**
 * Decodes a Base64 string into a Uint8Array.
 * @param base64 The Base64 string to decode.
 * @returns A Uint8Array containing the decoded bytes.
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
 * Decodes raw PCM audio data into an AudioBuffer using Web Audio API.
 * The PCM data is assumed to be Int16 (16-bit signed integer) Little-Endian.
 * @param data The Uint8Array containing the raw PCM audio bytes.
 * @param ctx The AudioContext to use for decoding.
 * @param sampleRate The sample rate of the PCM data (e.g., 24000).
 * @param numChannels The number of audio channels (e.g., 1 for mono).
 * @returns A Promise that resolves to an AudioBuffer.
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // Convert Uint8Array to Int16Array (16-bit signed integers)
  // Assuming the PCM data is 16-bit Little-Endian
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Normalize Int16 values to float32 range [-1, 1]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Converts an AudioBuffer to a WAV Blob.
 * Assumes the AudioBuffer has one channel (mono) and 16-bit PCM.
 * @param audioBuffer The AudioBuffer to convert.
 * @param sampleRate The sample rate of the audio.
 * @returns A Blob containing the WAV audio data.
 */
export function arrayBufferToWavBlob(audioBuffer: AudioBuffer, sampleRate: number): Blob {
  const numOfChan = audioBuffer.numberOfChannels;
  const bytesPerSample = 2; // 16-bit PCM
  const bitDepth = 16;
  const format = 1; // PCM
  const blockAlign = numOfChan * bytesPerSample;
  const byteRate = sampleRate * blockAlign;

  const dataLength = audioBuffer.length * numOfChan * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength); // WAV header is 44 bytes
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF'); // ChunkID
  view.setUint32(4, 36 + dataLength, true); // ChunkSize
  writeString(view, 8, 'WAVE'); // Format

  // fmt sub-chunk
  writeString(view, 12, 'fmt '); // Subchunk1ID
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numOfChan, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, 'data'); // Subchunk2ID
  view.setUint32(40, dataLength, true); // Subchunk2Size

  // Write audio data
  floatTo16BitPCM(view, 44, audioBuffer.getChannelData(0));

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(view: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}
