"use client";

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

  // Prepare legend data sorted by highest expenses and with consistent color mapping
  const allLegend = useMemo(() => {
    // Sort entries by value (highest first)
    const sortedEntries = [...entries].sort((a, b) => b[1] - a[1]);

    return sortedEntries.map(([label, value], i) => ({
      label,
      value,
      color: DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    }));
  }, [entries]);

  // SVG sizing
  const width = 640; // logical SVG width
  const height = 200; // logical SVG height
  const paddingX = 10;
  const paddingY = 6;
  const capsuleHeight = 180;
  const strokeWidth = 15;
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

  // Selection state for click-to-focus behavior
  const [selected, setSelected] = useState<string | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLegendClick = (label: string) => {
    // Clear any previous timer
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

    // Toggle selection: if already selected, deselect; otherwise select
    if (selected === label) {
      setSelected(null);
    } else {
      setSelected(label);
      // Auto-deselect after 5 seconds
      resetTimerRef.current = setTimeout(() => setSelected(null), 5000);
    }
  };

  // Enabled data derived from selection
  const enabledLegend = useMemo(() => {
    if (selected) {
      // Show only the selected category
      return allLegend.filter(it => it.label === selected);
    }
    // Show all categories
    return allLegend;
  }, [allLegend, selected]);

  const enabledTotal = useMemo(() => enabledLegend.reduce((acc, it) => acc + (it.value || 0), 0), [enabledLegend]);

  // Compute dash segments with small gaps
  const gapPct = 0.015; // ~1.2% gap between segments
  const segments = useMemo(() => {
    if (!pathLength) return [] as { color: string; len: number; offset: number; label: string; value: number }[];
    const gap = pathLength * gapPct;
    const list: { color: string; len: number; offset: number; label: string; value: number }[] = [];
    let offset = 0;
    for (let i = 0; i < enabledLegend.length; i++) {
      const portion = enabledTotal === 0 ? 0 : enabledLegend[i].value / enabledTotal;
      const len = Math.max(0, pathLength * portion - gap);
      list.push({ color: enabledLegend[i].color, len, offset, label: enabledLegend[i].label, value: enabledLegend[i].value });
      offset += pathLength * portion;
    }
    return list;
  }, [enabledLegend, pathLength, enabledTotal]);

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
  }, [pathLength, enabledTotal, enabledLegend.length]);

  const handleSegmentClick = (label: string) => {
    handleLegendClick(label);
  };

  useEffect(() => () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
  }, []);

  const centerTitle = selected ? `Total ${selected}` : (title ?? "Total");
  const centerValue = enabledTotal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="p-6 border-b border-gray-200"
    >
      {/* Capsule Chart */}
      <div className="w-full flex flex-col items-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-[120px]"
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
              <g key={idx}>
                {/* Visible stroke */}
                <path
                  d={d}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={dash}
                  strokeDashoffset={-seg.offset}
                />
                {/* Invisible hit area to increase click/tap target */}
                <path
                  d={d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={strokeWidth + 18}
                  strokeLinecap="round"
                  strokeDasharray={dash}
                  strokeDashoffset={-seg.offset}
                  style={{ cursor: "pointer", pointerEvents: 'stroke' }}
                  onClick={() => handleSegmentClick(seg.label)}
                />
              </g>
            );
          })}

          {/* Center labels with bounce on change */}
          <motion.g
            key={`${centerTitle}-${centerValue}`}
            initial={{ scale: 0.92, opacity: 0.9 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.5, stiffness: 160, damping: 26 }}
          >
            <text
              x={width / 2}
              y={y + h / 2 - 16}
              textAnchor="middle"
              style={{ fill: "#111827", fontSize: 26, fontWeight: 300 }}
            >
              {centerTitle}
            </text>
            <text
              x={width / 2}
              y={y + h / 2 + 24 + 4}
              textAnchor="middle"
              style={{ fill: "#D02E2E", fontSize: 34, fontWeight: 800 }}
            >
              {settings ? formatCurrency(centerValue, settings.currency) : centerValue.toLocaleString()}
            </text>
          </motion.g>
        </svg>

        {/* Legend */}
        <div className="mt-4 w-full">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
            {allLegend.map((item: typeof allLegend[number]) => {
              const isSelected = selected === item.label;
              const isOtherSelected = selected && selected !== item.label;
              return (
                <button
                  type="button"
                  key={item.label}
                  onClick={() => handleLegendClick(item.label)}
                  className="flex items-center gap-[4px] select-none transition-opacity"
                  style={{ minHeight: 'auto', height: 'auto' }}
                  aria-pressed={isSelected}
                >
                  <svg width={14} height={6} className="shrink-0" aria-hidden="true" focusable="false" style={{ opacity: isOtherSelected ? 0.35 : 1 }}>
                    <rect x={0} y={0} width={14} height={6} rx={3} ry={3} fill={item.color} />
                  </svg>
                  <span className={`text-[12px] font-medium leading-none transition-colors ${isSelected ? 'text-black font-bold' : isOtherSelected ? 'text-gray-400' : 'text-black'
                    }`}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
