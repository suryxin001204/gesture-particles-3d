import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { ParticleShape, PARTICLE_COUNT } from '../types';
import { generateParticles } from '../utils/geometry';

interface SceneProps {
  currentShape: ParticleShape;
  color: string;
  interactionFactorRef: React.MutableRefObject<number>;
}

const Particles: React.FC<SceneProps> = ({ currentShape, color, interactionFactorRef }) => {
  const pointsRef = useRef<THREE.Points>(null);
  // Internal ref to smooth the scale value
  const currentScaleRef = useRef<number>(1.0);
  
  // Create geometry buffers
  const { positions, currentPositions, targetPositions } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const curr = new Float32Array(PARTICLE_COUNT * 3);
    const targ = new Float32Array(PARTICLE_COUNT * 3);
    
    // Initialize
    const initial = generateParticles(currentShape);
    curr.set(initial);
    targ.set(initial);
    pos.set(initial);

    return { 
      positions: pos, 
      currentPositions: curr, 
      targetPositions: targ 
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Update target positions when shape changes
  useEffect(() => {
    const newTargets = generateParticles(currentShape);
    targetPositions.set(newTargets);
  }, [currentShape, targetPositions]);

  // Animation Loop
  useFrame((state) => {
    if (!pointsRef.current) return;

    const geometry = pointsRef.current.geometry;
    const positionAttribute = geometry.attributes.position;
    
    // Lerp Speed (smooth transition)
    const lerpSpeed = 0.05;
    
    // Get interactive scale from HandTracker
    const targetScaleInput = interactionFactorRef.current;
    
    // Smooth the scale transition using Lerp to avoid jitter
    currentScaleRef.current = THREE.MathUtils.lerp(currentScaleRef.current, targetScaleInput, 0.1);
    const smoothedScale = currentScaleRef.current;
    
    // Animate points
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // 1. Interpolate current pos towards target shape pos
      currentPositions[i3] += (targetPositions[i3] - currentPositions[i3]) * lerpSpeed;
      currentPositions[i3 + 1] += (targetPositions[i3 + 1] - currentPositions[i3 + 1]) * lerpSpeed;
      currentPositions[i3 + 2] += (targetPositions[i3 + 2] - currentPositions[i3 + 2]) * lerpSpeed;

      // 2. Apply Interaction Scale & Slight Rotation/Noise
      const time = state.clock.getElapsedTime();
      
      // Add a gentle idle breathing if scale is near 1.0 (neutral)
      // If user is interacting (scale != 1.0), reduce breathing effect
      const breathing = Math.sin(time * 2) * 0.05 + 1;
      const isInteracting = Math.abs(smoothedScale - 1.0) > 0.05;
      const finalScale = isInteracting ? smoothedScale : smoothedScale * breathing;

      // Add simple rotation around Y axis for the whole cloud look
      const rotSpeed = 0.1 * time;
      const x = currentPositions[i3];
      const z = currentPositions[i3 + 2];
      
      const rotX = x * Math.cos(rotSpeed) - z * Math.sin(rotSpeed);
      const rotZ = x * Math.sin(rotSpeed) + z * Math.cos(rotSpeed);

      positionAttribute.setXYZ(
        i,
        rotX * finalScale,
        currentPositions[i3 + 1] * finalScale,
        rotZ * finalScale
      );
    }

    positionAttribute.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color={color}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        transparent={true}
        opacity={0.8}
      />
    </points>
  );
};

const Scene: React.FC<SceneProps> = (props) => {
  return (
    <div className="w-full h-screen bg-black">
      <Canvas camera={{ position: [0, 0, 8], fov: 60 }} dpr={[1, 2]}>
        <color attach="background" args={['#050505']} />
        <ambientLight intensity={0.5} />
        <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
        
        <Particles {...props} />
        
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          autoRotate={false} 
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
};

export default Scene;