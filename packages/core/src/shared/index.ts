/**
 * Engine-independent types and helpers shared by the engine worker and the UI.
 * Nothing in this entry point may import alphaTab (enforced by tests/lint).
 */
export * from './formats.ts';
export * from './open-error.ts';
export * from './summary.ts';
export * from './view.ts';
export * from './score-colors.ts';
export * from './protocol.ts';
export * from './playback.ts';
