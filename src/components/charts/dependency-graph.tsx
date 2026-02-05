"use client";

import { useMemo, useRef, useState } from "react";
import { TaskStatus } from "@prisma/client";

type Node = {
  id: string;
  title: string;
  status: TaskStatus;
};

type Edge = { from: string; to: string };

const lanes: { status: TaskStatus; label: string }[] = [
  { status: TaskStatus.BACKLOG, label: "Backlog" },
  { status: TaskStatus.TODO, label: "Todo" },
  { status: TaskStatus.IN_PROGRESS, label: "In progress" },
  { status: TaskStatus.BLOCKED, label: "Blocked" },
  { status: TaskStatus.DONE, label: "Done" },
];

export function DependencyGraph({
  nodes,
  edges,
  height = 520,
}: {
  nodes: Node[];
  edges: Edge[];
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [drag, setDrag] = useState<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const layout = useMemo(() => {
    const laneMap = new Map<TaskStatus, number>();
    lanes.forEach((l, i) => laneMap.set(l.status, i));

    const byLane = new Map<number, Node[]>();
    for (const n of nodes) {
      const lane = laneMap.get(n.status) ?? 0;
      const list = byLane.get(lane) ?? [];
      list.push(n);
      byLane.set(lane, list);
    }

    const colW = 260;
    const rowH = 84;
    const padX = 40;
    const padY = 60;

    const positions = new Map<string, { x: number; y: number; lane: number }>();
    for (const [lane, list] of byLane.entries()) {
      list.sort((a, b) => a.title.localeCompare(b.title));
      list.forEach((n, idx) => {
        const x = padX + lane * colW;
        const y = padY + idx * rowH;
        positions.set(n.id, { x, y, lane });
      });
    }

    const maxLane = Math.max(0, ...Array.from(byLane.keys()));
    const maxRows = Math.max(1, ...Array.from(byLane.values()).map((x) => x.length));

    const width = padX * 2 + (maxLane + 1) * colW;
    const computedHeight = padY * 2 + maxRows * rowH;

    return { positions, width, computedHeight, colW, rowH, padX, padY };
  }, [nodes]);

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  return (
    <div
      ref={wrapRef}
      className="relative overflow-hidden rounded-2xl border bg-background/60"
      style={{ height }}
      onWheel={(e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.08 : 0.08;
        setScale((s) => clamp(Number((s + delta).toFixed(2)), 0.6, 1.8));
      }}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        setDrag({ x: e.clientX, y: e.clientY, tx, ty });
      }}
      onPointerMove={(e) => {
        if (!drag) return;
        setTx(drag.tx + (e.clientX - drag.x));
        setTy(drag.ty + (e.clientY - drag.y));
      }}
      onPointerUp={() => setDrag(null)}
    >
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
        <button
          className="rounded-xl border bg-background/80 px-3 py-1 text-xs"
          onClick={() => {
            setScale(1);
            setTx(0);
            setTy(0);
          }}
          type="button"
        >
          Reset
        </button>
        <div className="rounded-xl border bg-background/80 px-3 py-1 font-mono text-xs text-muted-foreground">
          zoom {Math.round(scale * 100)}%
        </div>
      </div>

      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${layout.width} ${layout.computedHeight}`}
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: "0 0",
          touchAction: "none",
        }}
      >
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
        </defs>

        {lanes.map((l, i) => (
          <g key={l.status}>
            <text
              x={layout.padX + i * layout.colW}
              y={28}
              fill="var(--muted-foreground)"
              fontSize={12}
              fontFamily="var(--font-terminal)"
            >
              {l.label}
            </text>
            <line
              x1={layout.padX + i * layout.colW}
              y1={36}
              x2={layout.padX + i * layout.colW}
              y2={layout.computedHeight}
              stroke="var(--border)"
              opacity={0.6}
            />
          </g>
        ))}

        {/* edges */}
        <g opacity={0.75}>
          {edges.map((e) => {
            const from = layout.positions.get(e.from);
            const to = layout.positions.get(e.to);
            if (!from || !to) return null;
            const x1 = from.x + 210;
            const y1 = from.y + 18;
            const x2 = to.x;
            const y2 = to.y + 18;
            const mx = (x1 + x2) / 2;
            const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
            return <path key={`${e.from}-${e.to}`} d={d} fill="none" stroke="var(--border)" strokeWidth={2} />;
          })}
        </g>

        {/* nodes */}
        {nodes.map((n) => {
          const p = layout.positions.get(n.id);
          if (!p) return null;
          const fill =
            n.status === TaskStatus.BLOCKED
              ? "color-mix(in oklch, var(--destructive) 14%, var(--card))"
              : n.status === TaskStatus.DONE
                ? "color-mix(in oklch, var(--chart-2) 12%, var(--card))"
                : "var(--card)";

          return (
            <g key={n.id} filter="url(#shadow)">
              <a href={`/tasks?open=${n.id}`}>
                <rect
                  x={p.x}
                  y={p.y}
                  width={220}
                  height={44}
                  rx={14}
                  fill={fill}
                  stroke="var(--border)"
                />
                <text
                  x={p.x + 12}
                  y={p.y + 27}
                  fill="var(--foreground)"
                  fontSize={12}
                  fontFamily="var(--font-ui)"
                >
                  {n.title.length > 26 ? n.title.slice(0, 26) + "…" : n.title}
                </text>
              </a>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
