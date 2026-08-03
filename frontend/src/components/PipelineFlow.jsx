import { STATUS_ORDER, STATUS_COLORS } from "../constants.js";

// Hand-rolled SVG flow diagram rather than a Sankey library — this is a
// single source ("all applications") fanning out to N targets (current
// statuses), which doesn't need a real graph-layout algorithm, just
// proportional segment heights. Keeps the bundle free of an extra
// dependency for something this shape-simple.
const WIDTH = 720;
const HEIGHT = 380;
const TOP = 26;
const GAP = 10;
const SOURCE_X = 60;
const SOURCE_W = 24;
const TARGET_X = 560;
const TARGET_W = 24;

export default function PipelineFlow({ jobs }) {
  const total = jobs.length;
  const present = STATUS_ORDER.map((status) => ({
    status,
    count: jobs.filter((j) => j.status === status).length,
  })).filter((d) => d.count > 0);

  if (total === 0 || present.length === 0) {
    return (
      <div className="chart-card">
        <h3>Application pipeline flow</h3>
        <div className="empty-state">Add an application to see the flow.</div>
      </div>
    );
  }

  // Target nodes: proportional height (min 6px so a count of 1 is still
  // visible), stacked top to bottom with a fixed gap between each.
  const availableH = HEIGHT - TOP * 2 - GAP * (present.length - 1);
  const pxPerUnit = availableH / total;

  let y = TOP;
  const targets = present.map((d) => {
    const h = Math.max(pxPerUnit * d.count, 6);
    const node = { ...d, y, h };
    y += h + GAP;
    return node;
  });

  // Source node: same segment heights as the targets they feed, but
  // packed with no gaps, so ribbon widths match on both ends.
  let sy = TOP;
  const sourceSegments = present.map((d, i) => {
    const h = targets[i].h;
    const seg = { ...d, y: sy, h };
    sy += h;
    return seg;
  });
  const sourceY0 = TOP;
  const sourceY1 = sy;

  function ribbonPath(seg, target) {
    const x1 = SOURCE_X + SOURCE_W;
    const x2 = TARGET_X;
    const midX = (x1 + x2) / 2;
    return `M${x1},${seg.y} C${midX},${seg.y} ${midX},${target.y} ${x2},${target.y} L${x2},${
      target.y + target.h
    } C${midX},${target.y + target.h} ${midX},${seg.y + seg.h} ${x1},${seg.y + seg.h} Z`;
  }

  return (
    <div className="chart-card">
      <h3>Application pipeline flow</h3>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="flow-svg" preserveAspectRatio="xMidYMid meet">
        <rect x={SOURCE_X} y={sourceY0} width={SOURCE_W} height={sourceY1 - sourceY0} rx="4" fill="#1c1f2b" />
        <text
          x={SOURCE_X - 10}
          y={(sourceY0 + sourceY1) / 2}
          textAnchor="end"
          dominantBaseline="middle"
          className="flow-source-label"
        >
          {total} total
        </text>

        {sourceSegments.map((seg, i) => (
          <path
            key={seg.status}
            d={ribbonPath(seg, targets[i])}
            fill={STATUS_COLORS[seg.status].fg}
            opacity="0.5"
          />
        ))}

        {targets.map((t) => (
          <g key={t.status}>
            <rect x={TARGET_X} y={t.y} width={TARGET_W} height={t.h} rx="4" fill={STATUS_COLORS[t.status].fg} />
            <text
              x={TARGET_X + TARGET_W + 10}
              y={t.y + t.h / 2}
              dominantBaseline="middle"
              className="flow-target-label"
            >
              {t.status} — {t.count}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
