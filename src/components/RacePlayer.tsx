"use client";

import { useEffect, useRef, useState } from "react";
import type { SimulatedRace } from "@/sim/race";
import { RACE_DISTANCE_M, STEP_MS } from "@/sim/engine";

interface Props {
  race: SimulatedRace;
  autoPlay?: boolean;
}

const LANE_COLORS = [
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#eab308",
  "#14b8a6",
];

export function RacePlayer({ race, autoPlay = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playing, setPlaying] = useState(autoPlay);
  const [timeMs, setTimeMs] = useState(0);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);

  const totalDurationMs = race.durationMs + 1000;

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTickRef.current = null;
      return;
    }
    const tick = (now: number) => {
      if (lastTickRef.current === null) lastTickRef.current = now;
      const dtMs = now - lastTickRef.current;
      lastTickRef.current = now;
      setTimeMs((t) => {
        const next = t + dtMs * speed;
        if (next >= totalDurationMs) {
          setPlaying(false);
          return totalDurationMs;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTickRef.current = null;
    };
  }, [playing, speed, totalDurationMs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    if (canvas.width !== cssWidth * dpr || canvas.height !== cssHeight * dpr) {
      canvas.width = cssWidth * dpr;
      canvas.height = cssHeight * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawScene(ctx, cssWidth, cssHeight, race, timeMs);
  }, [race, timeMs]);

  const finishedEntries = [...race.entries].sort(
    (a, b) => a.summary.finishTimeMs - b.summary.finishTimeMs,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
        <canvas ref={canvasRef} className="h-72 w-full rounded bg-amber-950/60" />
      </div>

      <div className="flex items-center gap-4 text-sm">
        <button
          onClick={() => {
            if (timeMs >= totalDurationMs) setTimeMs(0);
            setPlaying((p) => !p);
          }}
          className="rounded bg-amber-500 px-4 py-1.5 font-medium text-black hover:bg-amber-400"
        >
          {playing ? "Pause" : timeMs >= totalDurationMs ? "Replay" : "Play"}
        </button>
        <button
          onClick={() => {
            setPlaying(false);
            setTimeMs(0);
          }}
          className="rounded border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:bg-neutral-800"
        >
          Reset
        </button>
        <div className="flex gap-1">
          {[0.5, 1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`rounded px-2 py-1 text-xs ${
                speed === s
                  ? "bg-neutral-200 text-black"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
        <div className="ml-auto font-mono text-neutral-400">
          t = {(timeMs / 1000).toFixed(2)}s
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={totalDurationMs}
        step={STEP_MS}
        value={timeMs}
        onChange={(e) => {
          setPlaying(false);
          setTimeMs(Number(e.target.value));
        }}
        className="w-full accent-amber-500"
      />

      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <h3 className="mb-2 text-sm font-semibold text-neutral-300">Results</h3>
        <ol className="space-y-1 text-sm">
          {finishedEntries.map((e) => (
            <li key={e.aithleteId} className="flex items-center gap-3">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: LANE_COLORS[e.lane % LANE_COLORS.length] }}
              />
              <span className="w-6 text-neutral-500">#{e.placement}</span>
              <span className="flex-1">{e.name}</span>
              <span className="font-mono text-neutral-400">
                {(e.summary.finishTimeMs / 1000).toFixed(3)}s
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-xs text-neutral-400">
        <div className="font-semibold text-neutral-300">Conditions</div>
        <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-4">
          <div>Wind: {race.conditions.windMps.toFixed(2)} m/s</div>
          <div>Temp: {race.conditions.temperatureC.toFixed(1)}°C</div>
          <div>Track wear: {(race.conditions.trackWear * 100).toFixed(1)}%</div>
          <div>Block firmness: {race.conditions.startBlockFirmness.toFixed(2)}</div>
        </div>
        <div className="mt-2 font-mono text-neutral-600">seed: {race.seed}</div>
      </div>
    </div>
  );
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  race: SimulatedRace,
  timeMs: number,
) {
  ctx.clearRect(0, 0, width, height);

  const laneCount = race.entries.length;
  const topPadding = 24;
  const bottomPadding = 16;
  const laneHeight = (height - topPadding - bottomPadding) / laneCount;

  const positions = race.entries.map((entry) => frameAt(entry.frames, timeMs));
  const leadX = Math.max(0, ...positions.map((p) => p.x));

  const viewWindowM = 18;
  const cameraX = Math.max(0, leadX - viewWindowM * 0.5);
  const pxPerMeter = width / viewWindowM;

  ctx.fillStyle = "#5a3010";
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < laneCount; i++) {
    const y = topPadding + i * laneHeight;
    ctx.fillStyle = i % 2 === 0 ? "#7c3f18" : "#6a351a";
    ctx.fillRect(0, y, width, laneHeight);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y + laneHeight);
    ctx.lineTo(width, y + laneHeight);
    ctx.stroke();
  }

  for (let m = Math.floor(cameraX / 10) * 10; m <= cameraX + viewWindowM; m += 10) {
    if (m < 0) continue;
    const x = (m - cameraX) * pxPerMeter;
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.moveTo(x, topPadding);
    ctx.lineTo(x, height - bottomPadding);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillText(`${m}m`, x + 3, topPadding - 8);
  }

  const finishX = (100 - cameraX) * pxPerMeter;
  if (finishX > 0 && finishX < width) {
    const stripe = 4;
    for (let y = topPadding; y < height - bottomPadding; y += stripe) {
      ctx.fillStyle =
        Math.floor((y - topPadding) / stripe) % 2 === 0 ? "#fff" : "#000";
      ctx.fillRect(finishX, y, 3, stripe);
    }
  }

  race.entries.forEach((entry, i) => {
    const pos = positions[i];
    const laneY = topPadding + entry.lane * laneHeight + laneHeight * 0.62;
    const screenX = (pos.x - cameraX) * pxPerMeter;
    const color = LANE_COLORS[entry.lane % LANE_COLORS.length];
    drawStickFigure(ctx, screenX, laneY, color, timeMs, pos.speed, entry.name);
  });
}

interface FrameLike {
  x: number;
  speed: number;
  fatigue: number;
}

function frameAt(frames: { t: number; x: number; speed: number; fatigue: number }[], timeMs: number): FrameLike {
  if (frames.length === 0) return { x: 0, speed: 0, fatigue: 0 };
  if (timeMs <= frames[0].t) return frames[0];
  const last = frames[frames.length - 1];
  if (timeMs >= last.t) return last;
  // binary search
  let lo = 0;
  let hi = frames.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t <= timeMs) lo = mid;
    else hi = mid;
  }
  const a = frames[lo];
  const b = frames[hi];
  const span = b.t - a.t;
  const alpha = span > 0 ? (timeMs - a.t) / span : 0;
  return {
    x: a.x + (b.x - a.x) * alpha,
    speed: a.speed + (b.speed - a.speed) * alpha,
    fatigue: a.fatigue + (b.fatigue - a.fatigue) * alpha,
  };
}

function drawStickFigure(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  color: string,
  timeMs: number,
  speed: number,
  label: string,
) {
  if (x < -40 || x > ctx.canvas.width + 40) return;

  const bodyHeight = 34;
  const headRadius = 5;
  const hipY = groundY - bodyHeight * 0.45;
  const shoulderY = groundY - bodyHeight;
  const headY = shoulderY - headRadius - 2;

  const cadence = 0.012 + speed * 0.0009;
  const phase = timeMs * cadence;
  const legSwing = Math.sin(phase) * Math.min(1, speed / 10);
  const armSwing = Math.sin(phase + Math.PI) * Math.min(1, speed / 10);

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";

  // body
  ctx.beginPath();
  ctx.moveTo(x, shoulderY);
  ctx.lineTo(x, hipY);
  ctx.stroke();

  // head
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, headY, headRadius, 0, Math.PI * 2);
  ctx.fill();

  const legLen = bodyHeight * 0.55;
  const armLen = bodyHeight * 0.4;

  // legs
  ctx.beginPath();
  ctx.moveTo(x, hipY);
  ctx.lineTo(x + legSwing * 10, hipY + legLen);
  ctx.moveTo(x, hipY);
  ctx.lineTo(x - legSwing * 10, hipY + legLen);
  ctx.stroke();

  // arms
  ctx.beginPath();
  ctx.moveTo(x, shoulderY + 2);
  ctx.lineTo(x + armSwing * 8, shoulderY + armLen);
  ctx.moveTo(x, shoulderY + 2);
  ctx.lineTo(x - armSwing * 8, shoulderY + armLen);
  ctx.stroke();

  // label
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "10px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.fillText(label, x, headY - 10);
  ctx.textAlign = "start";
}
