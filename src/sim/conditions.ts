import seedrandom from "seedrandom";

export interface Conditions {
  windMps: number;
  temperatureC: number;
  trackWear: number;
  startBlockFirmness: number;
}

export function rollConditions(seed: string): Conditions {
  const rng = seedrandom(`${seed}:conditions`);
  return {
    windMps: round(rng() * 6 - 3, 2),
    temperatureC: round(rng() * 25 + 5, 1),
    trackWear: round(rng(), 3),
    startBlockFirmness: round(rng(), 3),
  };
}

function round(n: number, places: number): number {
  const m = 10 ** places;
  return Math.round(n * m) / m;
}
