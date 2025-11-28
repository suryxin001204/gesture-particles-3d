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
  const currentRotRef = useRef<THREE.Euler>(new THREE.Euler(0, 0, 0));
  
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
    const lerpSpeed = 0.15; 
    
    // Get interactive data
    const { 
      scale: targetScale, 
      position: targetPos,
      rotation: targetRot 
    } = interactionRef.current;
    
    // 1. Smooth Scale
    currentScaleRef.current = THREE.MathUtils.lerp(currentScaleRef.current, targetScale, 0.15);
    const smoothedScale = currentScaleRef.current;

    // 2. Smooth Position
    currentPosRef.current.x = THREE.MathUtils.lerp(currentPosRef.current.x, targetPos.x, 0.1);
    currentPosRef.current.y = THREE.MathUtils.lerp(currentPosRef.current.y, targetPos.y, 0.1);
    const offsetX = currentPosRef.current.x;
    const offsetY = currentPosRef.current.y;

    // 3. Smooth Rotation
    currentRotRef.current.x = THREE.MathUtils.lerp(currentRotRef.current.x, targetRot.x, 0.1);
    currentRotRef.current.y = THREE.MathUtils.lerp(currentRotRef.current.y, targetRot.y, 0.1);
    currentRotRef.current.z = THREE.MathUtils.lerp(currentRotRef.current.z, targetRot.z, 0.1);
    
    // Pre-calculate rotation matrix to apply to every particle efficiently
    const euler = new THREE.Euler(
        currentRotRef.current.x,
        currentRotRef.current.y + state.clock.getElapsedTime() * 0.05, // Add subtle auto-spin
        currentRotRef.current.z
    );
    const quaternion = new THREE.Quaternion().setFromEuler(euler);
    const tempVec = new THREE.Vector3();

    // Loop through particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // A. Interpolate shape morphing
      currentPositions[i3] += (targetPositions[i3] - currentPositions[i3]) * lerpSpeed;
      currentPositions[i3 + 1] += (targetPositions[i3 + 1] - currentPositions[i3 + 1]) * lerpSpeed;
      currentPositions[i3 + 2] += (targetPositions[i3 + 2] - currentPositions[i3 + 2]) * lerpSpeed;

      // B. Apply Scale
      const breathing = Math.sin(state.clock.getElapsedTime() * 2) * 0.05 + 1;
      const isInteracting = Math.abs(smoothedScale - 1.0) > 0.05;
      const finalScale = isInteracting ? smoothedScale : smoothedScale * breathing;

      // C. Apply Rotation
      tempVec.set(
        currentPositions[i3],
        currentPositions[i3 + 1],
        currentPositions[i3 + 2]
      );
      
      // Apply rotation quaternion
      tempVec.applyQuaternion(quaternion);

      // D. Apply Final Scale + Translation
      positionAttribute.setXYZ(
        i,
        tempVec.x * finalScale + offsetX,
        tempVec.y * finalScale + offsetY,
        tempVec.z * finalScale
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
        />
      </Canvas>
    </div>
  );
};

export default Scene;