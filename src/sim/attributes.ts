export const ATTRIBUTE_KEYS = [
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
] as const;

export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];
export type Attributes = Record<AttributeKey, number>;

export const BASELINE_VALUE = 5;
export const BUDGET_TOTAL = 100;
export const PER_RACE_DELTA_CAP = 5;

export function baselineAttributes(): Attributes {
  return Object.fromEntries(
    ATTRIBUTE_KEYS.map((k) => [k, BASELINE_VALUE]),
  ) as Attributes;
}

export function budgetSpent(attrs: Attributes): number {
  let total = 0;
  for (const key of ATTRIBUTE_KEYS) {
    total += costForValue(attrs[key]);
  }
  return total;
}

/**
 * Quadratic diminishing returns. Cost of raising an attribute from baseline to v.
 * Each point above baseline costs progressively more; below baseline frees points linearly.
 */
export function costForValue(value: number): number {
  if (value < 0) throw new Error(`negative attribute value: ${value}`);
  if (value <= BASELINE_VALUE) return value;
  const over = value - BASELINE_VALUE;
  return BASELINE_VALUE + over + Math.floor((over * over) / 2);
}

export function isWithinBudget(attrs: Attributes): boolean {
  return budgetSpent(attrs) <= BUDGET_TOTAL;
}

export type AttributeDeltas = Partial<Record<AttributeKey, number>>;

export function applyDeltas(attrs: Attributes, deltas: AttributeDeltas): Attributes {
  const next = { ...attrs };
  for (const key of ATTRIBUTE_KEYS) {
    const d = deltas[key];
    if (d !== undefined) next[key] = attrs[key] + d;
  }
  return next;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateDeltas(
  current: Attributes,
  deltas: AttributeDeltas,
): ValidationResult {
  const errors: string[] = [];
  let totalMovement = 0;
  let anyNegative = false;
  for (const key of ATTRIBUTE_KEYS) {
    const d = deltas[key] ?? 0;
    totalMovement += Math.abs(d);
    const next = current[key] + d;
    if (next < 0) {
      anyNegative = true;
      errors.push(`${key} would go negative (${next})`);
    }
  }
  if (totalMovement > PER_RACE_DELTA_CAP) {
    errors.push(
      `total movement ${totalMovement} exceeds per-race cap ${PER_RACE_DELTA_CAP}`,
    );
  }
  if (!anyNegative) {
    const proposed = applyDeltas(current, deltas);
    const spent = budgetSpent(proposed);
    if (spent > BUDGET_TOTAL) {
      errors.push(`budget exceeded: ${spent} > ${BUDGET_TOTAL}`);
    }
  }
  return { ok: errors.length === 0, errors };
}
