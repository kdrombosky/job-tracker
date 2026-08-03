import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { STATUS_ORDER, STATUS_COLORS, TERMINAL_STATUSES } from "../constants.js";

Chart.register(...registerables);

// total_days is computed server-side (see JobOut.total_days) and freezes
// at the terminal-status date for Accepted/Rejected/Withdrawn, so this
// chart mixes "still climbing" ranges (Applied/Screening/Interview/Offer)
// with "final" ranges (terminal statuses) — the tooltip calls that out
// explicitly so it doesn't read as an apples-to-apples comparison.
export default function TimeInStage({ jobs }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const rows = STATUS_ORDER.map((status) => {
      const days = jobs
        .filter((j) => j.status === status)
        .map((j) => j.total_days)
        .filter((d) => d !== null && d !== undefined);
      if (days.length === 0) return null;
      return {
        status,
        min: Math.min(...days),
        max: Math.max(...days),
        count: days.length,
      };
    }).filter(Boolean);

    chartRef.current?.destroy();
    if (rows.length === 0 || !canvasRef.current) return;

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: rows.map((r) => r.status),
        datasets: [
          {
            // Floating/range bars: Chart.js draws [min, max] pairs as a bar
            // spanning that range instead of starting at 0. A single-value
            // stage (min === max) gets padded by 1 purely so it renders as
            // a visible sliver instead of a zero-width bar.
            data: rows.map((r) => [r.min, r.max === r.min ? r.min + 1 : r.max]),
            backgroundColor: rows.map((r) => STATUS_COLORS[r.status].fg),
            borderRadius: 8,
            barThickness: 16,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const r = rows[ctx.dataIndex];
                const suffix = TERMINAL_STATUSES.includes(r.status) ? " (final)" : " (ongoing)";
                const range = r.min === r.max ? `${r.min} days` : `${r.min}–${r.max} days`;
                return `${range}${suffix}, ${r.count} job${r.count === 1 ? "" : "s"}`;
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { precision: 0 },
            title: { display: true, text: "Days since applying", font: { size: 10 } },
          },
          y: { grid: { display: false } },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [jobs]);

  return (
    <div className="chart-card">
      <h3>Time in pipeline by stage</h3>
      <div className="canvas-wrap">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}
