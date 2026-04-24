import { describe, it, expect } from "vitest";
import {
  BASELINE_VALUE,
  BUDGET_TOTAL,
  applyDeltas,
  baselineAttributes,
  budgetSpent,
  costForValue,
  isWithinBudget,
  validateDeltas,
} from "./attributes";

describe("attributes", () => {
  it("baseline spends exactly 75 points (15 attrs * 5)", () => {
    const a = baselineAttributes();
    expect(budgetSpent(a)).toBe(15 * BASELINE_VALUE);
    expect(isWithinBudget(a)).toBe(true);
  });

  it("budget leaves 25 headroom from baseline", () => {
    expect(BUDGET_TOTAL - 15 * BASELINE_VALUE).toBe(25);
  });

  it("cost is quadratic above baseline", () => {
    expect(costForValue(5)).toBe(5);
    expect(costForValue(6)).toBe(5 + 1 + 0);
    expect(costForValue(7)).toBe(5 + 2 + 2);
    expect(costForValue(10)).toBe(5 + 5 + 12);
    // successive marginal cost should be non-decreasing
    let prevMarginal = -Infinity;
    for (let v = 5; v < 15; v++) {
      const marginal = costForValue(v + 1) - costForValue(v);
      expect(marginal).toBeGreaterThanOrEqual(prevMarginal);
      prevMarginal = marginal;
    }
  });

  it("rejects negative attribute values", () => {
    const a = baselineAttributes();
    const result = validateDeltas(a, { reaction_time: -6 });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("negative"))).toBe(true);
  });

  it("enforces per-race movement cap", () => {
    const a = baselineAttributes();
    const result = validateDeltas(a, {
      top_speed: 3,
      acceleration: 3,
      endurance: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("per-race cap"))).toBe(true);
  });

  it("allows valid deltas within cap and budget", () => {
    const a = baselineAttributes();
    const result = validateDeltas(a, { top_speed: 2, acceleration: 2 });
    expect(result.ok).toBe(true);
    const next = applyDeltas(a, { top_speed: 2, acceleration: 2 });
    expect(next.top_speed).toBe(7);
    expect(next.acceleration).toBe(7);
    expect(isWithinBudget(next)).toBe(true);
  });

  it("rejects proposal exceeding total budget", () => {
    const a = baselineAttributes();
    // push one attribute high enough that total cost exceeds 100
    const spiked = applyDeltas(a, { top_speed: 5 });
    // Spiked not over budget yet, verify: top_speed=10 cost=22, rest=14*5=70, total=92
    expect(isWithinBudget(spiked)).toBe(true);
    const result = validateDeltas(spiked, { top_speed: 5 });
    // top_speed would become 15 - cost=5+10+50=65, plus 14*5=70 => 135 > 100
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("budget exceeded"))).toBe(true);
  });
});
