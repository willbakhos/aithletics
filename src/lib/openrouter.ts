import {
  ATTRIBUTE_KEYS,
  type AttributeDeltas,
  type AttributeKey,
  type Attributes,
  BASELINE_VALUE,
  BUDGET_TOTAL,
  PER_RACE_DELTA_CAP,
  budgetSpent,
  costForValue,
  validateDeltas,
} from "@/sim/attributes";

export const MAX_INPUT_TOKENS = 4000;
export const MAX_OUTPUT_TOKENS = 1500;

export interface RaceSummaryForPrompt {
  raceId: string;
  finishTimeMs: number;
  placement: number;
  conditions: unknown;
}

export interface LastRacePerformance {
  raceId: string;
  summary: Record<string, unknown>;
  keyframes: unknown[];
}

export interface CoachingPromptInput {
  aithleteName: string;
  currentAttributes: Attributes;
  lastRace: LastRacePerformance | null;
  recentRaces: RaceSummaryForPrompt[];
  userMessage: string;
}

export interface CoachingResponse {
  reasoning: string;
  attribute_deltas: AttributeDeltas;
  rationale_for_user: string;
}

export interface OpenRouterCall {
  model: string;
  apiKey: string;
  messages: { role: "system" | "user"; content: string }[];
  referer?: string;
}

export function buildSystemPrompt(current: Attributes): string {
  const spent = budgetSpent(current);
  const remaining = BUDGET_TOTAL - spent;
  const costTable = ATTRIBUTE_KEYS.slice(0, 1)
    .map(() =>
      [5, 6, 7, 8, 9, 10, 11, 12]
        .map((v) => `${v}=>${costForValue(v)}`)
        .join(", "),
    )
    .join("");

  return `You are a coaching AI for a stick-figure sprinter in a simulated 100m race.

Rules:
- There are exactly ${ATTRIBUTE_KEYS.length} attributes: ${ATTRIBUTE_KEYS.join(", ")}.
- Baseline value is ${BASELINE_VALUE} per attribute. The total point budget is ${BUDGET_TOTAL}. Current total spent: ${spent}. Headroom remaining: ${remaining}.
- Cost curve is quadratic above baseline: cost(value) table for one attribute: ${costTable}.
- Attributes cannot go negative.
- Per-race movement cap: the sum of absolute deltas across all attributes must be <= ${PER_RACE_DELTA_CAP}.

You MUST respond with exactly one JSON object and nothing else. Shape:
{
  "reasoning": "internal thought process, concise",
  "attribute_deltas": { "<attribute_name>": <integer delta>, ... },
  "rationale_for_user": "short (1-2 sentence) explanation the user will see"
}

Rules for attribute_deltas:
- Only include attributes you want to change.
- Use integer deltas (can be negative to free budget).
- Do not propose changes that would exceed the ${PER_RACE_DELTA_CAP}-point movement cap, make any attribute negative, or exceed the ${BUDGET_TOTAL}-point total budget after application.`;
}

export function buildUserPrompt(input: CoachingPromptInput): string {
  const attrLines = ATTRIBUTE_KEYS.map(
    (k) => `  ${k}: ${input.currentAttributes[k]}`,
  ).join("\n");

  const lastRace = input.lastRace
    ? `LAST RACE (id=${input.lastRace.raceId}):\n${JSON.stringify(input.lastRace, null, 2)}`
    : "LAST RACE: none yet.";

  const recent = input.recentRaces.length
    ? `RECENT RACES:\n${input.recentRaces
        .map(
          (r) =>
            `  - race ${r.raceId}: placed #${r.placement}, ${r.finishTimeMs}ms, conditions=${JSON.stringify(r.conditions)}`,
        )
        .join("\n")}`
    : "RECENT RACES: none.";

  return `Aithlete name: ${input.aithleteName}

CURRENT ATTRIBUTES:
${attrLines}

${lastRace}

${recent}

USER MESSAGE:
${input.userMessage}

Respond with the JSON object as specified.`;
}

/**
 * Call OpenRouter. Returns the raw response string + parsed JSON when parsing
 * succeeds. Callers must still validate the deltas against budget/cap/negatives.
 */
export async function callOpenRouter(
  call: OpenRouterCall,
): Promise<{ raw: string; parsed: CoachingResponse | null; error?: string }> {
  const body = {
    model: call.model,
    messages: call.messages,
    max_tokens: MAX_OUTPUT_TOKENS,
    temperature: 0.4,
    response_format: { type: "json_object" },
  };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${call.apiKey}`,
      "Content-Type": "application/json",
      ...(call.referer ? { "HTTP-Referer": call.referer } : {}),
      "X-Title": "AI Olympics",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    return { raw: text, parsed: null, error: `openrouter ${res.status}: ${text.slice(0, 300)}` };
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  const parsed = safeParse(content);
  return { raw: content, parsed };
}

function safeParse(raw: string): CoachingResponse | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.attribute_deltas !== "object"
    ) {
      return null;
    }
    const deltas: AttributeDeltas = {};
    for (const [k, v] of Object.entries(parsed.attribute_deltas as Record<string, unknown>)) {
      if ((ATTRIBUTE_KEYS as readonly string[]).includes(k) && typeof v === "number" && Number.isInteger(v)) {
        deltas[k as AttributeKey] = v;
      }
    }
    return {
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
      attribute_deltas: deltas,
      rationale_for_user:
        typeof parsed.rationale_for_user === "string" ? parsed.rationale_for_user : "",
    };
  } catch {
    return null;
  }
}

export { validateDeltas };
