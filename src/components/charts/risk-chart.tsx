"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";

import type { HistoryPoint } from "@/lib/types";

const timeFormat = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

interface Row {
  t: number;
  risk: number;
}

function RiskTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-lift">
      <div className="opacity-70 tabular">{timeFormat.format(new Date(row.t * 1000))}</div>
      <div className="mt-0.5 text-[13px] font-medium">Nguy cơ {row.risk.toFixed(0)}%</div>
    </div>
  );
}

/** Nguy cơ bắt nạt theo thời gian (1 chuỗi) + đường ngưỡng cảnh báo. */
export function RiskChart({ history, threshold }: { history: HistoryPoint[]; threshold: number }) {
  const data: Row[] = history.map((p) => ({
    t: p.t,
    risk: p.risk ?? (p.bullying ? p.confidence : 0),
  }));

  return (
    <AreaChart
      responsive
      data={data}
      margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
      style={{ width: "100%", height: 200 }}
    >
      <defs>
        <linearGradient id="risk-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--series-bullying)" stopOpacity={0.18} />
          <stop offset="100%" stopColor="var(--series-bullying)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid vertical={false} stroke="var(--hairline)" />
      <XAxis
        dataKey="t"
        type="number"
        domain={["dataMin", "dataMax"]}
        tickFormatter={(t: number) => timeFormat.format(new Date(t * 1000))}
        tick={{ fill: "var(--ink-3)", fontSize: 11 }}
        tickLine={false}
        axisLine={{ stroke: "var(--hairline-2)" }}
        minTickGap={56}
        tickMargin={8}
      />
      <YAxis
        domain={[0, 100]}
        ticks={[0, 25, 50, 75, 100]}
        tickFormatter={(v: number) => `${v}%`}
        tick={{ fill: "var(--ink-3)", fontSize: 11 }}
        tickLine={false}
        axisLine={false}
        width={48}
      />
      {/* Ngưỡng cảnh báo: nét đứt vì là mốc tham chiếu, không phải dữ liệu */}
      <ReferenceLine
        y={threshold}
        stroke="var(--critical)"
        strokeDasharray="4 4"
        strokeOpacity={0.6}
        label={{ value: `Ngưỡng ${threshold}%`, position: "insideTopRight", fill: "var(--ink-3)", fontSize: 11 }}
      />
      <Tooltip content={<RiskTooltip />} cursor={{ stroke: "var(--hairline-2)", strokeWidth: 1 }} isAnimationActive={false} />
      <Area
        type="monotone"
        dataKey="risk"
        stroke="var(--series-bullying)"
        strokeWidth={2}
        fill="url(#risk-fill)"
        dot={false}
        activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
        isAnimationActive={false}
      />
    </AreaChart>
  );
}
