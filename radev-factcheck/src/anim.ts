import {Easing, interpolate, spring} from 'remotion';
import {FPS} from './theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Плавен преход 0→1 между два кадъра (ease-out cubic). */
export const ease = (frame: number, from: number, to: number): number =>
  interpolate(frame, [from, to], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});

/** Линеен преход 0→1. */
export const lin = (frame: number, from: number, to: number): number =>
  interpolate(frame, [from, to], [0, 1], clamp);

/** Отсечен spring — бързо и стегнато влизане. */
export const pop = (frame: number, delay = 0, stiffness = 200, damping = 18): number =>
  spring({frame: frame - delay, fps: FPS, config: {stiffness, damping, mass: 0.7}});

/** Spring с лек отскок за ударни моменти. */
export const slam = (frame: number, delay = 0): number =>
  spring({frame: frame - delay, fps: FPS, config: {stiffness: 260, damping: 13, mass: 0.6}});
