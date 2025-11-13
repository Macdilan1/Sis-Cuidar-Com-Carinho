import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData, audioBufferToWaveBlob } from '../utils/audioUtils';

/**
 * Generates speech from the given text using the Gemini Text-to-Speech model.
 * @param text The text to convert to speech.
 * @returns A URL to the generated audio (WAV format).
 */
export async function generateSpeech(text: string): Promise<string> {
  // CRITICAL: Create a new GoogleGenAI instance right before making an API call
  // to ensure it always uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          // Using 'Zephyr' for a friendly, natural voice. Other options: 'Kore', 'Puck', 'Charon', 'Fenrir'.
          prebuiltVoiceConfig: { voiceName: 'Zephyr' },
        },
      },
    },
  });

  const base64EncodedAudioString = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!base64EncodedAudioString) {
    throw new Error('No audio data received from the Gemini API.');
  }

  // Define sample rate and number of channels as expected by the TTS model output (24000 Hz, mono).
  const sampleRate = 24000;
  const numChannels = 1;

  // Fix: Remove the deprecated `webkitAudioContext` as `AudioContext` is standard.
  // Create a new AudioContext for decoding
  const outputAudioContext = new AudioContext({ sampleRate: sampleRate });

  // Decode the base64 string into raw Uint8Array (PCM)
  const decodedBytes = decode(base64EncodedAudioString);

  // Decode the raw PCM bytes into an AudioBuffer
  const audioBuffer = await decodeAudioData(
    decodedBytes,
    outputAudioContext,
    sampleRate,
    numChannels,
  );

  // Convert the AudioBuffer to a WAV Blob
  const waveBlob = audioBufferToWaveBlob(audioBuffer);

  // Create an object URL for the Blob to be used in an <audio> tag
  return URL.createObjectURL(waveBlob);
}