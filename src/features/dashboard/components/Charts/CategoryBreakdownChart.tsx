import { useEffect, useMemo, useRef, useState } from "react";
import { motion, animate, useMotionValue } from "framer-motion";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/lib/formatters";

interface CategoryBreakdownChartProps {
  categoryTotals: Record<string, number>;
  title?: string; // optional custom title inside the capsule
}

// A friendly palette aligned with the Figma example
const DEFAULT_COLORS = [
  "#E58C17", // (orange-brown)
  "#6B74F6", // (indigo)
  "#DAB500", // (yellow)
  "#5B8DDF", // (blue)
  "#5A5A5A", // (gray)
  "#35A3C8", // (teal)
  "#E25555", // (red)
  "#58C46B", // (green)
  "#E07AD9", // (pink)
];

export function CategoryBreakdownChart({ categoryTotals, title }: CategoryBreakdownChartProps) {
  const { settings } = useSettings();

  // Guard clauses
  if (!categoryTotals || Object.keys(categoryTotals).length === 0) return null;

  // Filter out categories we don't want to visualize
  const filtered = useMemo(
    () => Object.fromEntries(Object.entries(categoryTotals).filter(([c]) => c !== "Card Transfer")),
    [categoryTotals]
  );
  const entries = Object.entries(filtered);
  if (entries.length === 0) return null;

  const total = entries.reduce((acc, [, v]) => acc + (v || 0), 0);

  // Prepare legend data with consistent color mapping
  const legend = entries.map(([label, value], i) => ({
    label,
    value,
    color: DEFAULT_COLORS[i % DEFAULT_COLORS.length],
  }));

  // SVG sizing
  const width = 640; // logical SVG width
  const height = 190; // logical SVG height
  const paddingX = 0;
  const paddingY = 6;
  const capsuleHeight = 180;
  const strokeWidth = 10;
  const rx = capsuleHeight / 2; // fully rounded ends

  const x = paddingX;
  const y = paddingY;
  const w = width - paddingX * 2;
  const h = capsuleHeight;

  // Capsule path definition (rounded rectangle)
  const d = `M ${x + rx},${y} H ${x + w - rx} A ${rx},${rx} 0 0 1 ${x + w},${y + rx} V ${y + h - rx} A ${rx},${rx} 0 0 1 ${x + w - rx},${y + h} H ${x + rx} A ${rx},${rx} 0 0 1 ${x},${y + h - rx} V ${y + rx} A ${rx},${rx} 0 0 1 ${x + rx},${y} Z`;

  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(0);

  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
    }
  }, [d]);

  // Compute dash segments with small gaps
  const gapPct = 0.012; // ~1.2% gap between segments
  const segments = useMemo(() => {
    if (!pathLength) return [] as { color: string; len: number; offset: number }[];
    const gap = pathLength * gapPct;
    const list: { color: string; len: number; offset: number }[] = [];
    let offset = 0;
    for (let i = 0; i < legend.length; i++) {
      const portion = total === 0 ? 0 : legend[i].value / total;
      const len = Math.max(0, pathLength * portion - gap);
      list.push({ color: legend[i].color, len, offset });
      offset += pathLength * portion;
    }
    return list;
  }, [legend, pathLength, total]);

  // Animate drawing progress from 0 to 1 on mount and whenever data changes
  const progress = useMotionValue(0);
  const [progressValue, setProgressValue] = useState(0);
  useEffect(() => {
    const controls = animate(progress, 1, {
      type: "spring",
      bounce: 0.5, // pronounced bounce
      stiffness: 140,
      damping: 30,
      delay: 0.05,
    });
    const unsub = progress.on("change", setProgressValue);
    return () => {
      controls.stop();
      unsub();
      progress.set(0);
    };
  }, [pathLength, total, legend.length]);

  const centerTitle = title ?? "Total";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-lg shadow-sm p-6 mb-6"
    >
      {/* Capsule Chart */}
      <div className="w-full flex flex-col items-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-[100px]"
        >
          {/* Invisible base path to measure length */}
          <path ref={pathRef} d={d} fill="none" stroke="transparent" strokeWidth={strokeWidth} />

          {/* Background track */}
          <path d={d} fill="none" stroke="#F1F5F9" strokeWidth={strokeWidth} />

          {/* Segments */}
          {segments.map((seg, idx) => {
            // Fill each segment from 0 -> its own full length simultaneously
            const visible = Math.max(0, Math.min(seg.len, progressValue * seg.len));
            const dash = `${visible} ${pathLength}`;
            return (
              <path
                key={idx}
                d={d}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={dash}
                strokeDashoffset={-seg.offset}
              />
            );
          })}

          {/* Center labels */}
          <g>
            <text
              x={width / 2}
              y={y + h / 2 - 12}
              textAnchor="middle"
              style={{ fill: "#111827", fontSize: 22, fontWeight: 300 }}
            >
              {centerTitle}
            </text>
            <text
              x={width / 2}
              y={y + h / 2 + 24 + 4}
              textAnchor="middle"
              style={{ fill: "#D02E2E", fontSize: 32, fontWeight: 800 }}
            >
              {settings ? formatCurrency(total, settings.currency) : total.toLocaleString()}
            </text>
          </g>
        </svg>

        {/* Legend */}
        <div className="mt-6 w-full">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
            {legend.map((item) => (
              <div key={item.label} className="flex items-center gap-[4px]">
                <svg width={14} height={6} className="shrink-0" aria-hidden="true" focusable="false">
                  <rect x={0} y={0} width={14} height={6} rx={3} ry={3} fill={item.color} />
                </svg>
                <span className="text-[12px] font-medium text-black leading-none">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
