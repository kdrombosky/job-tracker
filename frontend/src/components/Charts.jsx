import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { STATUS_ORDER, STATUS_COLORS } from "../constants.js";

Chart.register(...registerables);

// Same rule as StatsCards: `jobs` should be the full unfiltered list, so
// the charts describe the whole job search, not whatever's currently
// filtered into the table.
export default function Charts({ jobs }) {
  const statusCanvasRef = useRef(null);
  const timeCanvasRef = useRef(null);
  const statusChartRef = useRef(null);
  const timeChartRef = useRef(null);

  useEffect(() => {
    const counts = STATUS_ORDER.map((s) => jobs.filter((j) => j.status === s).length);

    statusChartRef.current?.destroy();
    statusChartRef.current = new Chart(statusCanvasRef.current, {
      type: "bar",
      data: {
        labels: STATUS_ORDER,
        datasets: [
          {
            data: counts,
            backgroundColor: STATUS_ORDER.map((s) => STATUS_COLORS[s].fg),
            borderRadius: 6,
            maxBarThickness: 34,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0 } },
          y: { grid: { display: false } },
        },
      },
    });

    return () => statusChartRef.current?.destroy();
  }, [jobs]);

  useEffect(() => {
    const byMonth = {};
    jobs.forEach((j) => {
      if (!j.date_applied) return;
      const key = j.date_applied.slice(0, 7); // YYYY-MM
      byMonth[key] = (byMonth[key] || 0) + 1;
    });
    const months = Object.keys(byMonth).sort();
    let cumulative = 0;
    const cumulativeData = months.map((m) => (cumulative += byMonth[m]));
    const monthLabels = months.map((m) => {
      const [y, mo] = m.split("-");
      return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString(undefined, {
        month: "short",
        year: "2-digit",
      });
    });

    timeChartRef.current?.destroy();
    timeChartRef.current = new Chart(timeCanvasRef.current, {
      data: {
        labels: monthLabels,
        datasets: [
          {
            type: "bar",
            label: "Applications",
            data: months.map((m) => byMonth[m]),
            backgroundColor: "#c9cdf7",
            borderRadius: 5,
            maxBarThickness: 28,
            order: 2,
          },
          {
            type: "line",
            label: "Cumulative",
            data: cumulativeData,
            borderColor: "#4f5df0",
            backgroundColor: "#4f5df0",
            tension: 0.3,
            pointRadius: 3,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, position: "top", labels: { boxWidth: 12, font: { size: 11 } } } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
          x: { grid: { display: false } },
        },
      },
    });

    return () => timeChartRef.current?.destroy();
  }, [jobs]);

  return (
    <div className="charts-grid">
      <div className="chart-card">
        <h3>Status breakdown</h3>
        <div className="canvas-wrap">
          <canvas ref={statusCanvasRef}></canvas>
        </div>
      </div>
      <div className="chart-card">
        <h3>Applications over time</h3>
        <div className="canvas-wrap">
          <canvas ref={timeCanvasRef}></canvas>
        </div>
      </div>
    </div>
  );
}
