"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { frameworkWeights, type Market } from "@/data/research";

const COLORS = {
  blue: "#38bdf8",
  teal: "#2dd4bf",
  amber: "#fbbf24",
  grid: "rgba(148, 163, 184, 0.22)",
  text: "#94a3b8",
};

const axisStyle = { fontSize: 11, fill: COLORS.text };

function ChartFrame({ height, children }: { height: number; children: (width: number, height: number) => React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(ref.current);
    setWidth(Math.floor(ref.current.getBoundingClientRect().width));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ height }} className="w-full">
      {width > 0 ? children(width, height) : null}
    </div>
  );
}

export function MarketScoresChart({ markets }: { markets: Market[] }) {
  return (
    <ChartFrame height={260}>
      {(width, height) => (
      <BarChart width={width} height={height} data={markets}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
        <Tooltip />
        <Bar dataKey="score" name="Score" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
        <Bar dataKey="confidence" name="Confidence" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
      </BarChart>
      )}
    </ChartFrame>
  );
}

export function CompletenessChart({ markets }: { markets: Market[] }) {
  return (
    <ChartFrame height={260}>
      {(width, height) => (
      <BarChart width={width} height={height} data={markets} layout="vertical" margin={{ left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
        <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={86} tick={axisStyle} tickLine={false} axisLine={false} />
        <Tooltip />
        <Bar dataKey="completeness" name="Research completeness" fill={COLORS.amber} radius={[0, 4, 4, 0]} />
      </BarChart>
      )}
    </ChartFrame>
  );
}

export function HistoricalScoreChart({ market }: { market: Market }) {
  return (
    <ChartFrame height={240}>
      {(width, height) => (
      <LineChart width={width} height={height} data={market.history}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="month" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} domain={[30, 100]} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="score" stroke={COLORS.blue} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="confidence" stroke={COLORS.teal} strokeWidth={2} dot={false} />
      </LineChart>
      )}
    </ChartFrame>
  );
}

export function FrameworkRadar({ market }: { market: Market }) {
  const data = frameworkWeights.map((item) => ({
    label: item.label.replace(" / ", "\n"),
    score: market.framework[item.key],
  }));

  return (
    <ChartFrame height={280}>
      {(width, height) => (
      <RadarChart width={width} height={height} data={data}>
        <PolarGrid stroke={COLORS.grid} />
        <PolarAngleAxis dataKey="label" tick={axisStyle} />
        <Radar dataKey="score" fill={COLORS.blue} fillOpacity={0.25} stroke={COLORS.blue} strokeWidth={2} />
        <Tooltip />
      </RadarChart>
      )}
    </ChartFrame>
  );
}

export function FrameworkBars({ market }: { market: Market }) {
  const data = frameworkWeights.map((item) => ({
    label: item.label,
    score: market.framework[item.key],
    weight: item.weight,
  }));

  return (
    <ChartFrame height={340}>
      {(width, height) => (
      <BarChart width={width} height={height} data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
        <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" width={150} tick={axisStyle} tickLine={false} axisLine={false} />
        <Tooltip />
        <Bar dataKey="score" fill={COLORS.teal} radius={[0, 4, 4, 0]} />
      </BarChart>
      )}
    </ChartFrame>
  );
}
