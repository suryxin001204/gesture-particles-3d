export enum ParticleShape {
  GALAXY = 'Galaxy',
  HEART = 'Heart',
  FLOWER = 'Flower',
  SATURN = 'Saturn',
  FIREWORKS = 'Fireworks'
}

export const PARTICLE_COUNT = 4000;

export interface AppState {
  shape: ParticleShape;
  color: string;
}