"use client";

import { useState } from "react";
import { formatTHB } from "@/lib/format";

export interface RevenueChartDatum {
  month: string;
  current: number;
  previous: number;
}

interface RevenueChartProps {
  data: RevenueChartDatum[];
}

const W = 600;
const H = 220;
const PAD_LEFT = 48;
const PAD_RIGHT = 20;
const PAD_TOP = 20;
const PAD_BOTTOM = 24;
const CHART_W = W - PAD_LEFT - PAD_RIGHT;
const CHART_H = H - PAD_TOP - PAD_BOTTOM;

export function RevenueChart({ data }: RevenueChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-caption text-muted-foreground">
        ยังไม่มีข้อมูลรายได้
      </div>
    );
  }

  const labels = data.map((d) => d.month);
  const current = data.map((d) => d.current);
  const prev = data.map((d) => d.previous);
  const maxVal = Math.max(...current, ...prev, 1) * 1.1;

  const xAt = (i: number) =>
    PAD_LEFT + (i / Math.max(1, labels.length - 1)) * CHART_W;
  const yAt = (v: number) => PAD_TOP + CHART_H - (v / maxVal) * CHART_H;

  const currentPoints = current.map((v, i) => [xAt(i), yAt(v)] as const);
  const prevPoints = prev.map((v, i) => [xAt(i), yAt(v)] as const);

  const first = currentPoints[0]!;
  const areaPath =
    `M ${first[0]} ${first[1]} ` +
    currentPoints
      .slice(1)
      .map(([px, py]) => `L ${px} ${py}`)
      .join(" ") +
    ` L ${currentPoints[currentPoints.length - 1]![0]} ${PAD_TOP + CHART_H} ` +
    ` L ${first[0]} ${PAD_TOP + CHART_H} Z`;

  const yLabels = [
    `฿${Math.round(maxVal / 1000)}k`,
    `฿${Math.round((maxVal * 0.75) / 1000)}k`,
    `฿${Math.round((maxVal * 0.5) / 1000)}k`,
    `฿${Math.round((maxVal * 0.25) / 1000)}k`,
    "฿0",
  ];

  // Active index: hovered point, or last point as default highlight.
  const activeIdx = hoverIdx ?? labels.length - 1;
  const activePoint = currentPoints[activeIdx]!;
  const activeMonth = labels[activeIdx]!;
  const activeCurrent = current[activeIdx]!;
  const activePrev = prev[activeIdx]!;

  // Tooltip width changes based on whether we show a YoY delta line.
  const tooltipWidth = 132;
  const tooltipHeight = 56;
  const tooltipX = Math.max(
    PAD_LEFT,
    Math.min(W - PAD_RIGHT - tooltipWidth, activePoint[0] - tooltipWidth / 2),
  );
  const tooltipY = Math.max(PAD_TOP - 4, activePoint[1] - tooltipHeight - 12);

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const xInChart = ratio * W;
    if (xInChart < PAD_LEFT - 8 || xInChart > W - PAD_RIGHT + 8) {
      setHoverIdx(null);
      return;
    }
    const ratioInChart = Math.min(
      1,
      Math.max(0, (xInChart - PAD_LEFT) / CHART_W),
    );
    const idx = Math.round(ratioInChart * (labels.length - 1));
    setHoverIdx(idx);
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: 220 }}
      role="img"
      aria-label="กราฟรายได้รายเดือน"
      onMouseMove={onMouseMove}
      onMouseLeave={() => setHoverIdx(null)}
    >
      <defs>
        <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y-axis gridlines */}
      {yLabels.map((_, i) => {
        const yp = PAD_TOP + (i / (yLabels.length - 1)) * CHART_H;
        return (
          <line
            key={i}
            x1={PAD_LEFT}
            y1={yp}
            x2={W - PAD_RIGHT}
            y2={yp}
            stroke="var(--border-strong)"
            strokeWidth="0.5"
            strokeDasharray="3 3"
          />
        );
      })}
      {yLabels.map((l, i) => (
        <text
          key={i}
          x={PAD_LEFT - 8}
          y={PAD_TOP + i * (CHART_H / (yLabels.length - 1)) + 4}
          textAnchor="end"
          fill="var(--foreground-subtle)"
          fontSize="10"
          fontFamily="var(--font-numeric)"
        >
          {l}
        </text>
      ))}

      {/* Previous-year dashed line */}
      <polyline
        points={prevPoints.map(([px, py]) => `${px},${py}`).join(" ")}
        fill="none"
        stroke="var(--border-strong)"
        strokeWidth="2"
        strokeDasharray="5 4"
      />

      {/* Current-year area + line */}
      <path d={areaPath} fill="url(#revFill)" />
      <polyline
        points={currentPoints.map(([px, py]) => `${px},${py}`).join(" ")}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2.5"
      />

      {/* Data points */}
      {currentPoints.map(([px, py], i) => (
        <circle
          key={i}
          cx={px}
          cy={py}
          r="4.5"
          fill="var(--surface)"
          stroke="var(--primary)"
          strokeWidth="2"
        />
      ))}

      {/* Hover/active indicator */}
      <g>
        <line
          x1={activePoint[0]}
          y1={PAD_TOP}
          x2={activePoint[0]}
          y2={PAD_TOP + CHART_H}
          stroke="var(--accent)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <circle
          cx={activePoint[0]}
          cy={activePoint[1]}
          r="6"
          fill="var(--accent)"
        />

        {/* Tooltip card */}
        <rect
          x={tooltipX}
          y={tooltipY}
          width={tooltipWidth}
          height={tooltipHeight}
          rx={6}
          fill="var(--surface)"
          stroke="var(--border-strong)"
          strokeWidth="1"
        />
        <text
          x={tooltipX + 10}
          y={tooltipY + 16}
          fill="var(--foreground-muted)"
          fontSize="10"
          fontFamily="var(--font-numeric)"
        >
          {activeMonth}
        </text>
        <text
          x={tooltipX + 10}
          y={tooltipY + 32}
          fill="var(--foreground)"
          fontSize="12"
          fontWeight="600"
          fontFamily="var(--font-numeric)"
        >
          {formatTHB(activeCurrent)}
        </text>
        <text
          x={tooltipX + 10}
          y={tooltipY + 47}
          fill="var(--foreground-subtle)"
          fontSize="10"
          fontFamily="var(--font-numeric)"
        >
          ปีก่อน {formatTHB(activePrev)}
        </text>
      </g>

      {/* X-axis labels */}
      {labels.map((m, i) => (
        <text
          key={i}
          x={xAt(i)}
          y={H - 4}
          textAnchor="middle"
          fill="var(--foreground-subtle)"
          fontSize="11"
        >
          {m}
        </text>
      ))}
    </svg>
  );
}
