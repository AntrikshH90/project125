"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type Trend = {
  date: string;
  pct: number;
  score: number;
  total: number;
  mode: string;
};
type ByTopic = {
  topic: string;
  right: number;
  total: number;
  pct: number;
};

export function AnalyticsCharts({
  trend,
  byTopic,
}: {
  trend: Trend[];
  byTopic: ByTopic[];
}) {
  return (
    <section className="grid md:grid-cols-2 gap-4">
      <div className="card p-4">
        <h2 className="font-semibold mb-3">Score trend</h2>
        <div className="h-56">
          <ResponsiveContainer>
            <LineChart data={trend}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" stroke="#8b8f9c" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="#8b8f9c" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#13141a",
                  border: "1px solid #262833",
                  borderRadius: 8,
                }}
              />
              <Line
                type="monotone"
                dataKey="pct"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: "#8b5cf6", r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-3">Accuracy by topic</h2>
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={byTopic}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="topic"
                stroke="#8b8f9c"
                fontSize={10}
                angle={-25}
                textAnchor="end"
                height={50}
              />
              <YAxis stroke="#8b8f9c" fontSize={11} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  background: "#13141a",
                  border: "1px solid #262833",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                {byTopic.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.pct >= 75
                        ? "#10b981"
                        : entry.pct >= 50
                          ? "#f59e0b"
                          : "#ef4444"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
