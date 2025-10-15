"use client";

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, Chart } from 'chart.js';
import { motion } from "framer-motion";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency, formatDate } from "@/lib/formatters";

// Dynamically import Line to disable SSR for Chart.js components
const Line = dynamic(() => import('react-chartjs-2').then(m => m.Line), { ssr: false });

interface DailySpendingChartProps {
  dailyTotals: Record<string, number>;
  mode?: 'expenses' | 'income';
  title?: string;
  _color?: string;
}

export function DailySpendingChart({ dailyTotals, mode = 'expenses', title, _color }: DailySpendingChartProps) {
  const [isMounted, setIsMounted] = useState(false);
  const { settings } = useSettings();
  const chartRef = useRef<any>(null);
  const lockedIndexRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);
    } catch (_) {
      // Already registered
    }
    setIsMounted(true);
  }, []);

  // Clear lock when clicking outside the chart area
  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      const chart = chartRef.current?.chart || chartRef.current;
      const container: HTMLElement | undefined = chart?.canvas?.parentNode;
      if (!container) return;
      if (!container.contains(e.target as Node)) {
        lockedIndexRef.current = null;
        try {
          chart.setActiveElements([]);
          if (chart.tooltip) chart.tooltip.setActiveElements([], {} as any);
          chart.update('none');
        } catch {}
        const tooltipEl = container.querySelector('.chart-tooltip') as HTMLDivElement | null;
        if (tooltipEl) tooltipEl.style.opacity = '0';
      }
    }
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);


  const entries = useMemo(() => {
    return Object.entries(dailyTotals)
      .map(([d, v]) => [new Date(d), v] as const)
      .sort((a, b) => a[0].getTime() - b[0].getTime());
  }, [dailyTotals]);

  const labels = useMemo(() => 
    entries.map(([date]) => settings ? formatDate(date, settings.calendar, 'yyyy/MM/dd') : date.toISOString().slice(0, 10)), 
    [entries, settings]
  );
  
  const values = useMemo(() => entries.map(([, v]) => v), [entries]);

  if (!dailyTotals || Object.keys(dailyTotals).length === 0 || entries.length === 0) {
    return null;
  }

  if (!isMounted) {
    return <div className="py-6 border-b border-gray-200 h-40 animate-pulse" />;
  }

  const chartData = {
    labels,
    datasets: [
      {
        label: mode === 'income' ? 'Daily Income' : 'Daily Expenses',
        data: values,
        borderColor: '#6B7280',
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHitRadius: 20,
        tension: 0,
        fill: true,
        backgroundColor: (ctx: { chart: Chart }) => {
          const { ctx: c, chartArea } = ctx.chart;
          if (!chartArea) return '#9CA3AF';
          const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, '#9CA3AF66');
          gradient.addColorStop(1, '#F9F9F9');
          return gradient;
        },
      },
    ],
  };

  const customPlugin = {
    id: 'customInteraction',
    afterDraw(chart: any) {
      const { ctx, tooltip, chartArea } = chart;
      // Determine active index from hover or locked click
      let dataIndex: number | null = null;
      if (tooltip && tooltip._active && tooltip._active.length) {
        dataIndex = tooltip._active[0].index;
      } else if (lockedIndexRef.current != null) {
        dataIndex = lockedIndexRef.current;
      }
      if (dataIndex == null) return;

      const meta = chart.getDatasetMeta(0);
      const elem = meta.data[dataIndex];
      if (!elem) return;
      const x = elem.x;
      const y = elem.y;
      
      ctx.save();
      
      // Dashed guideline
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#9CA3AF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Dot
      ctx.fillStyle = '#6B7280';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    },
  };

  const tooltipPlugin = {
    id: 'customTooltip',
    afterDraw(chart: any) {
      const { tooltip } = chart;
      const parent = chart.canvas.parentNode;
      
      let tooltipEl = parent.querySelector('.chart-tooltip');
      if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.className = 'chart-tooltip';
        tooltipEl.style.cssText = 'position:absolute;pointer-events:none;opacity:0;transition:opacity 0.15s;z-index:10;';
        const inner = document.createElement('div');
        inner.className = 'tooltip-inner';
        inner.style.cssText = 'background:#4B5563;color:white;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:500;box-shadow:0 2px 8px rgba(0,0,0,0.15);white-space:nowrap;';
        tooltipEl.appendChild(inner);
        parent.appendChild(tooltipEl);
      }
      // Determine active index from hover or locked click
      let dataIndex: number | null = null;
      if (tooltip && tooltip._active && tooltip._active.length) {
        dataIndex = tooltip._active[0].index;
      } else if (lockedIndexRef.current != null) {
        dataIndex = lockedIndexRef.current;
      }
      if (dataIndex == null) {
        tooltipEl.style.opacity = '0';
        return;
      }

      const meta = chart.getDatasetMeta(0);
      const elem = meta.data[dataIndex];
      if (!elem) {
        tooltipEl.style.opacity = '0';
        return;
      }
      const x = elem.x;
      const y = elem.y;
      const value = elem.$context?.parsed?.y ?? chart.data.datasets[0].data[dataIndex];

      const inner = tooltipEl.querySelector('.tooltip-inner');
      const formatted = settings ? formatCurrency(value, settings.currency) : `$${value.toFixed(0)}`;
      const dateLabel = chart.data.labels[dataIndex];

      // Create tooltip content with date above value
      inner.innerHTML = `
        <div style="font-size: 10px; color: #D1D5DB; margin-bottom: 2px;">${dateLabel}</div>
        <div style="font-size: 12px; font-weight: 500;">${formatted}</div>
      `;

      // Get tooltip dimensions
      tooltipEl.style.opacity = '1';
      tooltipEl.style.left = '0px';
      tooltipEl.style.top = '0px';
      tooltipEl.style.transform = 'none';
      const tooltipRect = tooltipEl.getBoundingClientRect();
      const tooltipWidth = tooltipRect.width;
      const tooltipHeight = tooltipRect.height;

      // Get chart container boundaries
      const chartRect = chart.canvas.getBoundingClientRect();
      const chartLeft = chartRect.left;
      const chartRight = chartRect.right;
      const chartTop = chartRect.top;
      const chartBottom = chartRect.bottom;

      // Calculate optimal tooltip position
      let tooltipX = x;
      let tooltipY = y - tooltipHeight - 8; // Position above the data point

      // Adjust horizontal position if tooltip would go outside chart boundaries
      if (tooltipX - tooltipWidth / 2 < chartLeft) {
        // Position tooltip to the right of the point for left edge
        tooltipX = x + tooltipWidth / 2 - 8; // Small offset from point
      } else if (tooltipX + tooltipWidth / 2 > chartRight) {
        // Position tooltip to the left of the point for right edge
        tooltipX = x - tooltipWidth / 2 + 8; // Small offset from point
      }

      // Adjust vertical position if tooltip would go outside chart boundaries
      if (tooltipY < chartTop) {
        // If tooltip would go above chart, position below the data point as fallback
        tooltipY = y + 8;
      }

      tooltipEl.style.left = tooltipX + 'px';
      tooltipEl.style.top = tooltipY + 'px';
      tooltipEl.style.transform = 'translateX(-50%)';
    },
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 8,
        bottom: 20, // ensure room for bottom date label inside canvas
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { display: false },
        border: { display: false },
        ticks: { display: false },
      },
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { display: false },
      },
    },
    onHover: (_: any, elements: any[], chart: any) => {
      chart.canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
    },
    onClick: (evt: any, _els: any[], chart: any) => {
      // Set locked active element based on nearest index
      const elements = chart.getElementsAtEventForMode(evt, 'index', { intersect: false }, true);
      if (elements && elements.length) {
        const { index, datasetIndex } = elements[0];
        lockedIndexRef.current = index;
        try {
          chart.setActiveElements([{ datasetIndex, index }]);
          if (chart.tooltip) chart.tooltip.setActiveElements([{ datasetIndex, index }], { x: elements[0].element.x, y: elements[0].element.y });
        } catch {}
        chart.update('none');
      }
    },
  } as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="py-6 border-b border-gray-200"
    >
      <div className="relative h-40">
        <Line ref={chartRef} data={chartData} options={options} plugins={[customPlugin, tooltipPlugin]} />
      </div>
    </motion.div>
  );
}
