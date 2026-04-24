import seedrandom from "seedrandom";
import type { Attributes } from "./attributes";
import { ATTRIBUTE_KEYS } from "./attributes";
import type { Conditions } from "./conditions";

export const RACE_DISTANCE_M = 100;
export const STEP_MS = 10;
export const MAX_RACE_MS = 30_000;

export interface Frame {
  t: number;
  x: number;
  speed: number;
  fatigue: number;
  form: number;
}

export interface SimSummary {
  finishTimeMs: number;
  peakSpeedMps: number;
  reactionMs: number;
  avgFormScore: number;
  fatigueAtFinish: number;
  didFinish: boolean;
}

export interface SimResult {
  finishTimeMs: number;
  frames: Frame[];
  keyframes: Frame[];
  summary: SimSummary;
}

export interface SimInput {
  attributes: Attributes;
  conditions: Conditions;
  seed: string;
}

/**
 * Deterministic 100m sprint sim.
 * All stochastic variation comes from the seeded RNG; identical inputs always
 * produce identical outputs. Attributes are treated as a point-budget vector
 * and mapped into physical parameters (reaction time, peak accel, top speed, etc).
 */
export function simulateRace(input: SimInput): SimResult {
  const { attributes: a, conditions, seed } = input;
  const rng = seedrandom(`${seed}:sim`);

  const reactionMs = mapReactionMs(a.reaction_time, a.mental_focus, a.start_technique, conditions.startBlockFirmness);
  const peakAccel = mapPeakAccel(a.acceleration, a.drive_phase_length, a.core_stability);
  const topSpeed = mapTopSpeed(a.top_speed, a.stride_length, a.stride_frequency, conditions.windMps);
  const enduranceCoeff = mapEndurance(a.endurance, a.fatigue_resistance);
  const formBaseline = mapFormBaseline(a.arm_drive, a.lean_angle, a.foot_strike, a.pronation, a.core_stability);
  const trackFriction = 1 - conditions.trackWear * 0.05;

  const frames: Frame[] = [];
  let x = 0;
  let speed = 0;
  let fatigue = 0;
  let formSum = 0;
  let formCount = 0;
  let peakSpeed = 0;
  let finishTimeMs = MAX_RACE_MS;
  let didFinish = false;

  for (let t = 0; t <= MAX_RACE_MS; t += STEP_MS) {
    const dt = STEP_MS / 1000;

    if (t < reactionMs) {
      frames.push({ t, x: 0, speed: 0, fatigue: 0, form: 0 });
      continue;
    }

    const jitter = (rng() - 0.5) * 0.02;
    const driveProgress = Math.min(1, (t - reactionMs) / (400 + a.drive_phase_length * 40));
    const effectiveAccel = peakAccel * (1 - driveProgress * 0.55) * trackFriction * (1 + jitter);

    const targetSpeed = topSpeed * (1 - fatigue * 0.35);
    if (speed < targetSpeed) {
      speed = Math.min(targetSpeed, speed + effectiveAccel * dt);
    } else {
      speed = Math.max(0, speed - 0.4 * dt * Math.max(0, fatigue - 0.2));
    }

    if (speed > peakSpeed) peakSpeed = speed;

    const fatigueRate = Math.max(0, speed / topSpeed - 0.6) * (0.12 - enduranceCoeff * 0.08);
    fatigue = Math.min(1, fatigue + fatigueRate * dt);

    const form = Math.max(
      0,
      Math.min(1, formBaseline - fatigue * 0.4 + (rng() - 0.5) * 0.02),
    );
    formSum += form;
    formCount += 1;

    x += speed * dt;

    frames.push({
      t,
      x: round(x, 4),
      speed: round(speed, 4),
      fatigue: round(fatigue, 4),
      form: round(form, 4),
    });

    if (x >= RACE_DISTANCE_M) {
      finishTimeMs = t;
      didFinish = true;
      break;
    }
  }

  const keyframes = compressToKeyframes(frames, 20);

  return {
    finishTimeMs,
    frames,
    keyframes,
    summary: {
      finishTimeMs,
      peakSpeedMps: round(peakSpeed, 3),
      reactionMs,
      avgFormScore: formCount ? round(formSum / formCount, 3) : 0,
      fatigueAtFinish: round(fatigue, 3),
      didFinish,
    },
  };
}

function mapReactionMs(
  reactionAttr: number,
  mentalFocus: number,
  startTech: number,
  blockFirmness: number,
): number {
  const base = 220 - reactionAttr * 8 - mentalFocus * 3 - startTech * 4;
  const firmnessBonus = (blockFirmness - 0.5) * 20;
  return Math.max(100, Math.round(base - firmnessBonus));
}

function mapPeakAccel(accel: number, drivePhase: number, core: number): number {
  return 4 + accel * 0.45 + drivePhase * 0.12 + core * 0.08;
}

function mapTopSpeed(
  topSpeed: number,
  strideLen: number,
  strideFreq: number,
  wind: number,
): number {
  const base = 7 + topSpeed * 0.32 + strideLen * 0.12 + strideFreq * 0.14;
  return base + wind * 0.15;
}

function mapEndurance(endurance: number, fatigueRes: number): number {
  return Math.min(1, endurance * 0.05 + fatigueRes * 0.06);
}

function mapFormBaseline(
  armDrive: number,
  lean: number,
  foot: number,
  pronation: number,
  core: number,
): number {
  return Math.min(
    1,
    0.5 + armDrive * 0.02 + lean * 0.015 + foot * 0.015 + pronation * 0.01 + core * 0.02,
  );
}

function compressToKeyframes(frames: Frame[], count: number): Frame[] {
  if (frames.length <= count) return frames.slice();
  const step = (frames.length - 1) / (count - 1);
  const out: Frame[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.round(i * step);
    out.push(frames[idx]);
  }
  return out;
}

function round(n: number, places: number): number {
  const m = 10 ** places;
  return Math.round(n * m) / m;
}

// Sanity check that attribute keys are consumed - prevents silent drift
// if someone renames an attribute but forgets to wire it into the sim.
export function assertAllAttributesReferenced(): void {
  const consumed = new Set<string>([
    "reaction_time",
    "acceleration",
    "top_speed",
    "stride_length",
    "stride_frequency",
    "endurance",
    "arm_drive",
    "lean_angle",
    "foot_strike",
    "pronation",
    "core_stability",
    "mental_focus",
    "fatigue_resistance",
    "start_technique",
    "drive_phase_length",
  ]);
  for (const k of ATTRIBUTE_KEYS) {
    if (!consumed.has(k)) throw new Error(`sim does not reference attribute ${k}`);
  }
}
