"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Table2 } from "lucide-react";

import { Segmented } from "@/components/ui/form";
import { formatDay, formatTime } from "@/lib/format";
import { CHART_EVENT_TYPES } from "@/lib/labels";
import type { TimelineBucket } from "@/lib/types";

type SeriesKey = (typeof CHART_EVENT_TYPES)[number]["key"];

// Thứ tự chồng từ đáy lên: "Bắt nạt" bám trục để dễ so sánh
const STACK: SeriesKey[] = ["bullying", "toxic_speech", "high_anger"];
const GAP = 2;
const RADIUS = 4;

function topRoundedPath(x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, w / 2, h));
  return [
    `M${x},${y + h}`,
    `L${x},${y + radius}`,
    `Q${x},${y} ${x + radius},${y}`,
    `L${x + w - radius},${y}`,
    `Q${x + w},${y} ${x + w},${y + radius}`,
    `L${x + w},${y + h}`,
    "Z",
  ].join(" ");
}

function makeSegment(series: SeriesKey, color: string) {
  return function Segment(props: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    payload?: TimelineBucket;
  }) {
    const { x = 0, y = 0, width = 0, height = 0, payload } = props;
    if (!payload || !payload[series] || height <= 0) return <g />;
    const top = [...STACK].reverse().find((key) => payload[key] > 0) === series;
    // Khe 2px màu nền giữa các đoạn chồng (thay cho viền)
    const h = Math.max(1, height - GAP);
    return <path d={topRoundedPath(x, y + (height - h), width, h, top ? RADIUS : 0)} fill={color} />;
  };
}

const SEGMENTS = Object.fromEntries(
  CHART_EVENT_TYPES.map((s) => [s.key, makeSegment(s.key, s.color)]),
) as Record<SeriesKey, ReturnType<typeof makeSegment>>;

function bucketLabel(t: number, bucket: number) {
  return bucket >= 86400 ? formatDay(t) : formatTime(t);
}

function ChartTooltip({
  active,
  payload,
  bucket,
}: {
  active?: boolean;
  payload?: { payload: TimelineBucket }[];
  bucket: number;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const total = STACK.reduce((sum, key) => sum + row[key], 0);
  return (
    <div className="min-w-44 rounded-md border border-line-strong bg-panel-3 px-3 py-2.5 text-xs shadow-xl shadow-black/50">
      <div className="mb-2 font-mono text-[11px] text-dim">
        {bucket >= 86400
          ? formatDay(row.t)
          : `${formatTime(row.t)} – ${formatTime(row.t + bucket)} · ${formatDay(row.t)}`}
      </div>
      {CHART_EVENT_TYPES.map((s) => (
        <div key={s.key} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-2 text-dim">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
          <span className="font-mono text-text tabular">{row[s.key]}</span>
        </div>
      ))}
      <div className="mt-1.5 flex justify-between border-t border-line pt-1.5 text-dim">
        <span>Tổng</span>
        <span className="font-mono text-text tabular">{total}</span>
      </div>
    </div>
  );
}

export function EventsChart({ data, bucket }: { data: TimelineBucket[]; bucket: number }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const totals = Object.fromEntries(
    STACK.map((key) => [key, data.reduce((sum, row) => sum + (row[key] ?? 0), 0)]),
  ) as Record<SeriesKey, number>;
  const tickEvery = Math.max(1, Math.round(data.length / 8));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* Legend luôn hiện (>= 2 series): màu nằm ở ô vuông, chữ dùng màu chữ */}
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
          {CHART_EVENT_TYPES.map((s) => (
            <li key={s.key} className="flex items-center gap-2 text-[13px] text-dim">
              <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label}
              <span className="font-mono text-xs text-text tabular">{totals[s.key]}</span>
            </li>
          ))}
        </ul>
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
          data={data}
          margin={{ top: 4, right: 4, bottom: 0, left: -18 }}
          style={{ width: "100%", height: 236 }}
          barCategoryGap="22%"
        >
          <CartesianGrid vertical={false} stroke="var(--line)" strokeWidth={1} />
          <XAxis
            dataKey="t"
            tickFormatter={(t: number) => bucketLabel(t, bucket)}
            interval={tickEvery - 1}
            tick={{ fill: "var(--text-mute)", fontSize: 11, fontFamily: "var(--font-jetbrains)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--line-strong)" }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--text-mute)", fontSize: 11, fontFamily: "var(--font-jetbrains)" }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={<ChartTooltip bucket={bucket} />}
            isAnimationActive={false}
          />
          {STACK.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="events"
              maxBarSize={24}
              shape={SEGMENTS[key]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      ) : (
        <div className="max-h-[236px] overflow-y-auto rounded-md border border-line">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-panel-2 text-mute">
              <tr>
                <th className="px-3 py-2 font-medium">Thời gian</th>
                {CHART_EVENT_TYPES.map((s) => (
                  <th key={s.key} className="px-3 py-2 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono tabular">
              {data
                .filter((row) => STACK.some((key) => row[key] > 0))
                .map((row) => (
                  <tr key={row.t} className="border-t border-line/70 text-dim">
                    <td className="px-3 py-1.5">
                      {bucketLabel(row.t, bucket)} {bucket < 86400 && formatDay(row.t)}
                    </td>
                    {STACK.map((key) => (
                      <td key={key} className="px-3 py-1.5 text-right text-text">
                        {row[key]}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
          {!data.some((row) => STACK.some((key) => row[key] > 0)) && (
            <div className="p-6 text-center text-sm text-dim">Chưa có cảnh báo trong khoảng này.</div>
          )}
        </div>
      )}
    </div>
  );
}
