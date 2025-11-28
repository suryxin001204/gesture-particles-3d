import React, { useState, useRef, useCallback } from 'react';
import Scene from './components/Scene';
import UIControls from './components/UIControls';
import HandTracker from './components/HandTracker';
import { ParticleShape } from './types';

const App: React.FC = () => {
  const [currentShape, setCurrentShape] = useState<ParticleShape>(ParticleShape.GALAXY);
  const [color, setColor] = useState<string>('#4ecdc4');
  const [isTracking, setIsTracking] = useState<boolean>(false);
  
  // Ref to share interaction data between HandTracker and Three.js Loop without re-renders
  // Default 1.0 scale
  const interactionFactorRef = useRef<number>(1.0);

  // Callback for HandTracker to update the ref
  const handleInteractionUpdate = useCallback((factor: number) => {
    // Smooth the transition slightly in the Ref update if needed, 
    // but the lerp in Scene handles visual smoothing.
    interactionFactorRef.current = factor;
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white font-sans selection:bg-cyan-500/30">
      
      {/* 3D Scene Background */}
      <Scene 
        currentShape={currentShape} 
        color={color} 
        interactionFactorRef={interactionFactorRef}
      />

      {/* UI Overlay */}
      <UIControls 
        currentShape={currentShape} 
        setShape={setCurrentShape} 
        color={color} 
        setColor={setColor}
        isTracking={isTracking}
      />

      {/* Logic / Sensing */}
      <HandTracker 
        onInteractionUpdate={handleInteractionUpdate} 
        setIsTracking={setIsTracking}
      />
      
    </div>
  );
};

export default App;