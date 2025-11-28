import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { ParticleShape, PARTICLE_COUNT } from '../types';
import { generateParticles } from '../utils/geometry';
import { InteractionData } from '../App';

interface SceneProps {
  currentShape: ParticleShape;
  color: string;
  interactionRef: React.MutableRefObject<InteractionData>;
}

const Particles: React.FC<SceneProps> = ({ currentShape, color, interactionRef }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Internal refs for smoothing
  const currentScaleRef = useRef<number>(1.0);
  const currentPosRef = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));
  
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
  }, []);

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
    
    // Lerp Speed (Response speed)
    // Increased to 0.15 for snappier movement as requested
    const lerpSpeed = 0.15; 
    
    // Get interactive data
    const { scale: targetScale, position: targetPos } = interactionRef.current;
    
    // Smooth the scale
    currentScaleRef.current = THREE.MathUtils.lerp(currentScaleRef.current, targetScale, 0.15);
    const smoothedScale = currentScaleRef.current;

    // Smooth the position
    currentPosRef.current.x = THREE.MathUtils.lerp(currentPosRef.current.x, targetPos.x, 0.1);
    currentPosRef.current.y = THREE.MathUtils.lerp(currentPosRef.current.y, targetPos.y, 0.1);
    const offsetX = currentPosRef.current.x;
    const offsetY = currentPosRef.current.y;
    
    // Animate points
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // 1. Interpolate current pos towards target shape pos
      currentPositions[i3] += (targetPositions[i3] - currentPositions[i3]) * lerpSpeed;
      currentPositions[i3 + 1] += (targetPositions[i3 + 1] - currentPositions[i3 + 1]) * lerpSpeed;
      currentPositions[i3 + 2] += (targetPositions[i3 + 2] - currentPositions[i3 + 2]) * lerpSpeed;

      // 2. Apply Interaction Scale & Rotation & TRANSLATION
      const time = state.clock.getElapsedTime();
      
      const breathing = Math.sin(time * 2) * 0.05 + 1;
      const isInteracting = Math.abs(smoothedScale - 1.0) > 0.05;
      const finalScale = isInteracting ? smoothedScale : smoothedScale * breathing;

      // Simple rotation around Y (relative to the group center, before translation)
      const rotSpeed = 0.1 * time;
      const baseX = currentPositions[i3];
      const baseZ = currentPositions[i3 + 2];
      
      const rotX = baseX * Math.cos(rotSpeed) - baseZ * Math.sin(rotSpeed);
      const rotZ = baseX * Math.sin(rotSpeed) + baseZ * Math.cos(rotSpeed);

      // Apply Scale + Rotation -> Then add Offset (Translation)
      positionAttribute.setXYZ(
        i,
        rotX * finalScale + offsetX,
        currentPositions[i3 + 1] * finalScale + offsetY,
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
      <Canvas camera={{ position: [0, 0, 10], fov: 60 }} dpr={[1, 2]}>
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