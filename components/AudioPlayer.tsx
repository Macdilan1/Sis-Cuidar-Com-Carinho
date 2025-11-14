
import React, { useCallback, useRef, useState, useEffect } from 'react';
import { decode, decodeAudioData } from '../utils/audioUtils';
// Fix: Import Button component
import { Button } from './Button';

interface AudioPlayerProps {
  base64Audio: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ base64Audio }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Initialize AudioContext only once
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Fix: Use window.AudioContext directly.
      audioContextRef.current = new window.AudioContext({ sampleRate: 24000 });
    }
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  const playAudio = useCallback(async () => {
    if (!base64Audio || !audioContextRef.current) return;

    // Stop any currently playing audio
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    try {
      const audioBytes = decode(base64Audio);
      const audioBuffer = await decodeAudioData(
        audioBytes,
        audioContextRef.current,
        24000, // sampleRate
        1,     // numChannels
      );

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      source.onended = () => {
        setIsPlaying(false);
        sourceNodeRef.current = null;
      };

      source.start(0);
      sourceNodeRef.current = source;
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  }, [base64Audio]);

  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  return (
    <div className="flex items-center gap-4 mt-4 p-3 bg-gray-100 rounded-md shadow-inner" aria-live="polite">
      <h4 className="sr-only">Controle de Áudio</h4>
      <Button
        onClick={isPlaying ? stopAudio : playAudio}
        disabled={!base64Audio}
        className={`px-4 py-2 rounded-md ${
          base64Audio
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'bg-gray-300 text-gray-600 cursor-not-allowed'
        }`}
        aria-label={isPlaying ? "Parar áudio" : "Reproduzir áudio"}
      >
        {isPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7H6v6h2V7zm5 0h-2v6h2V7z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        )}
      </Button>
      <span className="text-gray-700">{isPlaying ? 'Reproduzindo...' : 'Pronto para reproduzir'}</span>
    </div>
  );
};