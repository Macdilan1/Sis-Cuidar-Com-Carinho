import React from 'react';

interface AudioPlayerProps {
  src: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src }) => {
  if (!src) {
    return null;
  }

  return (
    <div className="w-full bg-gray-100 rounded-lg p-4 shadow-inner">
      <audio controls src={src} className="w-full">
        Seu navegador não suporta o elemento de áudio.
      </audio>
    </div>
  );
};