"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Table2 } from "lucide-react";

import { Segmented } from "@/components/ui/form";
import { formatDay, formatTime } from "@/lib/format";
import type { TimelineBucket } from "@/lib/types";

/** Các loại tính là "sự việc" trên biểu đồ (không tính thông báo kỹ thuật). */
const KINDS = ["bullying", "toxic_speech", "high_anger", "manual"] as const;

interface Row {
  t: number;
  n: number;
}

function weekday(t: number) {
  const day = new Date(t * 1000).getDay();
  return day === 0 ? "CN" : `T${day + 1}`;
}

function shortDate(t: number) {
  const date = new Date(t * 1000);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function label(t: number, bucket: number) {
  return bucket >= 86400 ? `${weekday(t)} · ${shortDate(t)}` : formatTime(t);
}

/** Nhãn trục ngày 2 dòng: thứ + ngày/tháng. */
function DayTick(props: { x?: number; y?: number; payload?: { value: number } }) {
  const { x = 0, y = 0, payload } = props;
  if (!payload) return <g />;
  return (
    <g transform={`translate(${x},${y + 6})`}>
      <text textAnchor="middle" fill="var(--ink-2)" fontSize={11.5} fontWeight={500}>
        <tspan x={0} dy="0.71em">
          {weekday(payload.value)}
        </tspan>
        <tspan x={0} dy="1.35em" fill="var(--ink-3)" fontWeight={400} fontSize={11}>
          {shortDate(payload.value)}
        </tspan>
      </text>
    </g>
  );
}

function TopRounded(props: { x?: number; y?: number; width?: number; height?: number; fill?: string }) {
  const { x = 0, y = 0, width = 0, height = 0, fill } = props;
  if (height <= 0) return <g />;
  const r = Math.min(4, width / 2, height);
  const d = `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`;
  return <path d={d} fill={fill} />;
}

function ChartTooltip({ active, payload, bucket }: { active?: boolean; payload?: { payload: Row }[]; bucket: number }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-lift">
      <div className="opacity-70">
        {bucket >= 86400 ? label(row.t, bucket) : `${formatTime(row.t)}–${formatTime(row.t + bucket)} · ${formatDay(row.t)}`}
      </div>
      <div className="mt-0.5 text-[13px] font-medium">{row.n} sự việc</div>
    </div>
  );
}

/** Số sự việc theo thời gian — 1 chuỗi dữ liệu nên không cần chú giải, tiêu đề đã gọi tên. */
export function EventsChart({ data, bucket, height = 220 }: { data: TimelineBucket[]; bucket: number; height?: number }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const rows: Row[] = data.map((b) => ({ t: b.t, n: KINDS.reduce((sum, key) => sum + (b[key] ?? 0), 0) }));
  const total = rows.reduce((sum, row) => sum + row.n, 0);
  const tickEvery = Math.max(1, Math.round(rows.length / 7));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="numeral text-[30px] leading-none text-ink">{total}</span>
          <span className="text-[13px] text-ink-3">sự việc trong khoảng này</span>
        </div>
        <Segmented
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: "chart", label: <BarChart3 />, title: "Biểu đồ" },
            { value: "table", label: <Table2 />, title: "Bảng số liệu" },
          ]}
        />
      </div>

      {view === "chart" ? (
        <BarChart
          responsive
          data={rows}
          margin={{ top: 6, right: 0, bottom: 0, left: -22 }}
          style={{ width: "100%", height }}
          barCategoryGap="28%"
        >
          <CartesianGrid vertical={false} stroke="var(--hairline)" />
          <XAxis
            dataKey="t"
            tickFormatter={(t: number) => label(t, bucket)}
            interval={tickEvery - 1}
            tick={bucket >= 86400 ? <DayTick /> : { fill: "var(--ink-3)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--hairline-2)" }}
            tickMargin={8}
            height={bucket >= 86400 ? 44 : 30}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--ink-3)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ fill: "rgb(22 24 29 / 0.035)", radius: 8 }}
            content={<ChartTooltip bucket={bucket} />}
            isAnimationActive={false}
          />
          <Bar dataKey="n" fill="var(--brand)" maxBarSize={36} shape={TopRounded} isAnimationActive={false} />
        </BarChart>
      ) : (
        <div className="overflow-y-auto rounded-2xl border border-hairline" style={{ maxHeight: height }}>
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-surface-2 text-ink-3">
              <tr>
                <th className="px-4 py-2.5 font-medium">Thời gian</th>
                <th className="px-4 py-2.5 text-right font-medium">Số sự việc</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {rows.map((row) => (
                <tr key={row.t} className="border-t border-hairline text-ink-2">
                  <td className="px-4 py-2">{label(row.t, bucket)}</td>
                  <td className="px-4 py-2 text-right text-ink">{row.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
