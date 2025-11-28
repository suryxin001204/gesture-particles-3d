import * as THREE from 'three';
import { ParticleShape, PARTICLE_COUNT } from '../types';

// Helper to get random point on sphere
const randomSpherePoint = (r: number) => {
  const theta = 2 * Math.PI * Math.random();
  const phi = Math.acos(2 * Math.random() - 1);
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
};

export const generateParticles = (shape: ParticleShape): Float32Array => {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    let x = 0, y = 0, z = 0;

    switch (shape) {
      case ParticleShape.HEART:
        // Parametric Heart
        // x = 16sin^3(t)
        // y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
        // z = variation for depth
        const t = Math.random() * Math.PI * 2;
        const scale = 0.15;
        // Add some random noise for volume
        const rNoise = 0.5 * (Math.random() - 0.5);
        
        x = (16 * Math.pow(Math.sin(t), 3)) * scale + (Math.random() - 0.5);
        y = (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * scale + (Math.random() - 0.5);
        z = (Math.random() - 0.5) * 2; 
        
        // Fill inside slightly
        if (Math.random() > 0.5) {
             const s = Math.random();
             x *= s; y *= s; z *= s;
        }
        break;

      case ParticleShape.GALAXY:
        // Spiral
        const angle = Math.random() * Math.PI * 2 * 3; // 3 turns
        const radius = Math.random() * 5;
        const spiralOffset = 0.5; // tightness
        
        x = (radius + spiralOffset * angle) * Math.cos(angle);
        z = (radius + spiralOffset * angle) * Math.sin(angle);
        y = (Math.random() - 0.5) * (10 - radius); // Thicker in center
        
        // Scale down to fit view
        x *= 0.3; y *= 0.1; z *= 0.3;
        break;

      case ParticleShape.SATURN:
        // Planet + Rings
        if (Math.random() > 0.6) {
          // Planet
          const p = randomSpherePoint(1.5);
          x = p.x; y = p.y; z = p.z;
        } else {
          // Rings
          const ringRad = 2.0 + Math.random() * 2.5;
          const theta = Math.random() * Math.PI * 2;
          x = ringRad * Math.cos(theta);
          z = ringRad * Math.sin(theta);
          y = (Math.random() - 0.5) * 0.1; // Flat ring
        }
        break;

      case ParticleShape.FLOWER:
        // Rose curve: r = cos(k * theta)
        const k = 4; // petals
        const thetaFl = Math.random() * Math.PI * 2;
        const radFl = Math.cos(k * thetaFl) * 3 + 1; // Base radius variation
        
        // Add depth variation
        const phiFl = (Math.random() - 0.5) * Math.PI * 0.5;
        
        x = radFl * Math.cos(thetaFl) * Math.cos(phiFl);
        y = radFl * Math.sin(thetaFl) * Math.cos(phiFl);
        z = radFl * Math.sin(phiFl);
        break;

      case ParticleShape.FIREWORKS:
        const pBurst = randomSpherePoint(Math.random() * 4);
        x = pBurst.x;
        y = pBurst.y;
        z = pBurst.z;
        break;
        
      default:
        x = (Math.random() - 0.5) * 10;
        y = (Math.random() - 0.5) * 10;
        z = (Math.random() - 0.5) * 10;
    }

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;
  }
  return positions;
};