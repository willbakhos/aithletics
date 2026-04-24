import { describe, it, expect } from "vitest";
import { baselineAttributes, applyDeltas } from "./attributes";
import { rollConditions } from "./conditions";
import { simulateRace } from "./engine";

describe("sim engine determinism", () => {
  it("produces identical output for identical inputs (1000 runs)", () => {
    const attrs = baselineAttributes();
    const seed = "determinism-test-seed";
    const conditions = rollConditions(seed);

    const first = simulateRace({ attributes: attrs, conditions, seed });
    const firstJson = JSON.stringify(first);

    for (let i = 0; i < 1000; i++) {
      const run = simulateRace({ attributes: attrs, conditions, seed });
      if (JSON.stringify(run) !== firstJson) {
        throw new Error(`divergence at run ${i}`);
      }
    }
    expect(first.summary.didFinish).toBe(true);
  });

  it("different seeds produce different results for same attributes", () => {
    const attrs = baselineAttributes();
    const a = simulateRace({
      attributes: attrs,
      conditions: rollConditions("seed-a"),
      seed: "seed-a",
    });
    const b = simulateRace({
      attributes: attrs,
      conditions: rollConditions("seed-b"),
      seed: "seed-b",
    });
    expect(a.finishTimeMs).not.toBe(b.finishTimeMs);
  });

  it("better attributes produce faster finish times on average", () => {
    const seed = "fairness-seed-42";
    const conditions = rollConditions(seed);
    const weak = baselineAttributes();
    const strong = applyDeltas(weak, {
      top_speed: 3,
      acceleration: 2,
    });

    const weakTime = simulateRace({ attributes: weak, conditions, seed }).finishTimeMs;
    const strongTime = simulateRace({ attributes: strong, conditions, seed }).finishTimeMs;
    expect(strongTime).toBeLessThan(weakTime);
  });

  it("baseline Aithlete finishes the race", () => {
    const attrs = baselineAttributes();
    const seed = "baseline-finish-seed";
    const result = simulateRace({
      attributes: attrs,
      conditions: rollConditions(seed),
      seed,
    });
    expect(result.summary.didFinish).toBe(true);
    expect(result.summary.finishTimeMs).toBeLessThan(20_000);
    expect(result.summary.finishTimeMs).toBeGreaterThan(10_000);
  });

  it("emits exactly 20 keyframes", () => {
    const attrs = baselineAttributes();
    const seed = "keyframe-seed";
    const result = simulateRace({
      attributes: attrs,
      conditions: rollConditions(seed),
      seed,
    });
    expect(result.keyframes.length).toBe(20);
  });

  it("headwind slows the athlete vs tailwind", () => {
    const attrs = baselineAttributes();
    const head = simulateRace({
      attributes: attrs,
      conditions: { windMps: -3, temperatureC: 20, trackWear: 0.2, startBlockFirmness: 0.5 },
      seed: "wind-compare",
    });
    const tail = simulateRace({
      attributes: attrs,
      conditions: { windMps: 3, temperatureC: 20, trackWear: 0.2, startBlockFirmness: 0.5 },
      seed: "wind-compare",
    });
    expect(tail.finishTimeMs).toBeLessThan(head.finishTimeMs);
  });
});
