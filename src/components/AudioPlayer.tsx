import React, { useEffect, useRef } from 'react';

interface Props {
  src?: string;
  label?: string;
}

export const AudioPlayer: React.FC<Props> = ({ src, label = 'Play Audio' }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (src && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Autoplay might fail; user can click button
      });
    }
  }, [src]);

  if (!src) return null;

  return (
    <div className="mt-2">
      <audio ref={audioRef} src={src} />
      <button onClick={() => audioRef.current?.play()} className="btn-secondary text-sm mt-1">
        {label}
      </button>
    </div>
  );
};
