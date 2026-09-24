"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";

import type { HistoryPoint } from "@/lib/types";

const SERIES = [
  { key: "risk", label: "Nguy cơ bắt nạt (hình ảnh)", color: "var(--series-bullying)" },
  { key: "anger", label: "Mức căng thẳng (âm thanh)", color: "var(--series-anger)" },
] as const;

const timeFormat = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

interface Row {
  t: number;
  risk: number;
  anger: number;
}

function RiskTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-md border border-line-strong bg-panel-3 px-3 py-2 text-xs shadow-xl shadow-black/50">
      <div className="mb-1.5 font-mono text-[11px] text-dim">{timeFormat.format(new Date(row.t * 1000))}</div>
      {SERIES.map((s) => (
        <div key={s.key} className="flex items-center justify-between gap-5 py-0.5">
          <span className="flex items-center gap-2 text-dim">
            <span className="h-0.5 w-3 rounded" style={{ background: s.color }} />
            {s.label}
          </span>
          <span className="font-mono text-text tabular">{row[s.key].toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
}

export function RiskChart({
  history,
  threshold,
  showAnger,
}: {
  history: HistoryPoint[];
  threshold: number;
  showAnger: boolean;
}) {
  const data: Row[] = history.map((p) => ({
    t: p.t,
    risk: p.risk ?? (p.bullying ? p.confidence : 0),
    anger: p.anger ?? 0,
  }));
  const series = showAnger ? SERIES : SERIES.slice(0, 1);

  return (
    <div>
      {series.length > 1 && (
        <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-2 text-[13px] text-dim">
              <span className="h-0.5 w-4 rounded" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <AreaChart
        responsive
        data={data}
        margin={{ top: 6, right: 8, bottom: 0, left: -18 }}
        style={{ width: "100%", height: 190 }}
      >
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis
          dataKey="t"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(t: number) => timeFormat.format(new Date(t * 1000))}
          tick={{ fill: "var(--text-mute)", fontSize: 10, fontFamily: "var(--font-jetbrains)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--line-strong)" }}
          minTickGap={48}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fill: "var(--text-mute)", fontSize: 10, fontFamily: "var(--font-jetbrains)" }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        {/* Ngưỡng cảnh báo: nét đứt vì là mốc tham chiếu, không phải lưới */}
        <ReferenceLine
          y={threshold}
          stroke="var(--critical)"
          strokeDasharray="4 4"
          strokeOpacity={0.7}
          label={{
            value: `Ngưỡng ${threshold}%`,
            position: "insideTopRight",
            fill: "var(--text-dim)",
            fontSize: 10,
          }}
        />
        <Tooltip
          content={<RiskTooltip />}
          cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }}
          isAnimationActive={false}
        />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={s.color}
            strokeWidth={2}
            fill={s.color}
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--panel)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </div>
  );
}
