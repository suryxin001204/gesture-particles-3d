import React, { useState } from 'react';
import { ParticleShape } from '../types';
import { Maximize2, Minimize2, Palette, Shapes } from 'lucide-react';

interface UIControlsProps {
  currentShape: ParticleShape;
  setShape: (shape: ParticleShape) => void;
  color: string;
  setColor: (color: string) => void;
  isTracking: boolean;
}

const SHAPE_OPTIONS = Object.values(ParticleShape);
const COLORS = ['#ffffff', '#ff6b6b', '#4ecdc4', '#ffe66d', '#ff9ff3', '#a29bfe'];

const SHAPE_LABELS: Record<ParticleShape, string> = {
  [ParticleShape.GALAXY]: '星系',
  [ParticleShape.HEART]: '爱心',
  [ParticleShape.FLOWER]: '花朵',
  [ParticleShape.SATURN]: '土星',
  [ParticleShape.FIREWORKS]: '烟花'
};

const UIControls: React.FC<UIControlsProps> = ({ 
  currentShape, 
  setShape, 
  color, 
  setColor,
  isTracking
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">
      {/* Header */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl">
          <h1 className="text-white font-bold text-xl tracking-wider flex items-center gap-2">
            <Shapes className="w-5 h-5 text-cyan-400" />
            粒子<span className="text-cyan-400">流体</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-300 uppercase tracking-widest">
              {isTracking ? '摄像头已开启' : '视觉系统初始化中...'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 max-w-[240px]">
            双手张合控制粒子扩散与缩放。
          </p>
        </div>

        <button 
          onClick={toggleFullscreen}
          className="bg-black/40 backdrop-blur-md p-3 rounded-full border border-white/10 hover:bg-white/10 transition-all text-white"
        >
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-center pointer-events-auto">
        
        {/* Shape Selector */}
        <div className="bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-white/10 flex gap-1 overflow-x-auto max-w-full">
          {SHAPE_OPTIONS.map((shape) => (
            <button
              key={shape}
              onClick={() => setShape(shape)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                currentShape === shape 
                  ? 'bg-cyan-500/80 text-white shadow-lg shadow-cyan-500/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {SHAPE_LABELS[shape]}
            </button>
          ))}
        </div>

        {/* Color Selector */}
        <div className="bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex items-center gap-3">
          <Palette className="w-4 h-4 text-gray-400" />
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  color === c ? 'border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UIControls;