
import React, { useState, useEffect, useRef } from 'react';

interface AuraOrbProps {
  isListening: boolean;
  isSpeaking: boolean;
  onClick: () => void;
}

const AuraOrb: React.FC<AuraOrbProps> = ({ isListening, isSpeaking, onClick }) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 120, y: window.innerHeight - 120 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y
        });
      }
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      className="fixed z-50 cursor-pointer"
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        if (!isDragging) onClick();
      }}
    >
      <div className={`
        aura-orb w-20 h-20 rounded-full flex items-center justify-center
        transition-all duration-500
        ${isListening ? 'ring-4 ring-blue-400 scale-110' : ''}
        ${isSpeaking ? 'ring-4 ring-purple-400 animate-bounce' : ''}
      `}>
        <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
          <div className="relative w-full h-full">
             <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 animate-pulse"></div>
             <i className={`fas ${isListening ? 'fa-microphone' : 'fa-brain'} text-2xl text-white`}></i>
          </div>
        </div>
      </div>
      {isSpeaking && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white text-slate-900 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-lg">
          Aura is speaking...
        </div>
      )}
    </div>
  );
};

export default AuraOrb;
