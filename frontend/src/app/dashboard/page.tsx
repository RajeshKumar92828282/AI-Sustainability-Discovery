"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText,
  Activity,
  TrendingUp,
  Leaf,
  Clock3,
  ShieldCheck,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Stats = {
  total: number;
  submitted: number;
  under_review: number;
  action_planned: number;
  in_progress: number;
  resolved: number;
  verified: number;
  with_photo: number;
  by_category: Record<string, number>;
};

const STATUS_COLORS_MAP: Record<string, string> = {
  submitted: "#94a3b8",
  under_review: "#60a5fa",
  action_planned: "#fbbf24",
  in_progress: "#fb923c",
  resolved: "#34d399",
  verified: "#2dd4bf",
};

const PIE_COLORS = [
  "#34d399",
  "#60a5fa",
  "#fbbf24",
  "#f87171",
  "#a78bfa",
  "#fb923c",
  "#2dd4bf",
];

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStats() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_URL}/api/reports/stats`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to load dashboard data.");
      }

      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to connect to backend."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  // Chart data
  const statusChartData = stats
    ? [
        { name: "Submitted", value: stats.submitted, color: STATUS_COLORS_MAP.submitted },
        { name: "Under Review", value: stats.under_review, color: STATUS_COLORS_MAP.under_review },
        { name: "Action Planned", value: stats.action_planned, color: STATUS_COLORS_MAP.action_planned },
        { name: "In Progress", value: stats.in_progress, color: STATUS_COLORS_MAP.in_progress },
        { name: "Resolved", value: stats.resolved, color: STATUS_COLORS_MAP.resolved },
        { name: "Verified", value: stats.verified, color: STATUS_COLORS_MAP.verified },
      ]
    : [];

  const categoryChartData = stats
    ? Object.entries(stats.by_category)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value }))
    : [];

  const resolutionRate =
    stats && stats.total > 0
      ? Math.round(((stats.resolved + stats.verified) / stats.total) * 100)
      : 0;

  const activeCount = stats
    ? (stats.under_review || 0) + (stats.action_planned || 0) + (stats.in_progress || 0)
    : 0;

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-2 font-semibold">
            <Leaf size={18} className="text-emerald-400" />
            AI Sustainability Discovery
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12">
        {/* Title */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-xs font-medium text-emerald-400">
              <BarChart3 size={14} />
              Impact Dashboard
            </div>

            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Sustainability Impact
            </h1>

            <p className="mt-3 max-w-2xl text-base text-white/50">
              Real metrics from real reports. All data is sourced directly from
              the database — no fabricated numbers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadStats}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/5 disabled:opacity-50"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => router.push("/report")}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-white/80 transition hover:bg-white/5"
            >
              <FileText size={17} />
              View Reports
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/5 p-5">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-400" />
            <div>
              <p className="font-medium text-red-300">Unable to load dashboard</p>
              <p className="mt-1 text-sm text-red-300/60">{error}</p>
              <button
                onClick={loadStats}
                className="mt-3 text-sm font-medium text-red-300 underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-8 animate-pulse space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 rounded-2xl bg-white/5" />
              ))}
            </div>
            <div className="h-72 rounded-2xl bg-white/5" />
          </div>
        )}

        {/* Dashboard Content */}
        {!loading && stats && (
          <div className="mt-8 space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={<FileText size={20} />}
                label="Total Reports"
                value={String(stats.total)}
                sub="All submitted reports"
                color="slate"
              />
              <MetricCard
                icon={<Activity size={20} />}
                label="Actively Being Addressed"
                value={String(activeCount)}
                sub="Under review, planned, or in progress"
                color="blue"
              />
              <MetricCard
                icon={<CheckCircle2 size={20} />}
                label="Reports Resolved"
                value={String(stats.resolved + stats.verified)}
                sub="Resolved or verified"
                color="emerald"
              />
              <MetricCard
                icon={<TrendingUp size={20} />}
                label="Resolution Rate"
                value={`${resolutionRate}%`}
                sub="Of all submitted reports"
                color="teal"
              />
            </div>

            {/* Secondary metrics */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <p className="text-xs uppercase tracking-wider text-white/30">
                  With Photo Evidence
                </p>
                <p className="mt-2 text-3xl font-semibold">{stats.with_photo}</p>
                <p className="mt-1 text-xs text-white/30">
                  {stats.total > 0
                    ? `${Math.round((stats.with_photo / stats.total) * 100)}% of reports`
                    : "No reports yet"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <p className="text-xs uppercase tracking-wider text-white/30">
                  Verified
                </p>
                <p className="mt-2 text-3xl font-semibold text-teal-400">
                  {stats.verified}
                </p>
                <p className="mt-1 text-xs text-white/30">
                  Human-verified resolutions
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <p className="text-xs uppercase tracking-wider text-white/30">
                  Categories Reported
                </p>
                <p className="mt-2 text-3xl font-semibold">
                  {Object.keys(stats.by_category).length}
                </p>
                <p className="mt-1 text-xs text-white/30">
                  Distinct sustainability areas
                </p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Status distribution bar chart */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                <h2 className="mb-6 font-semibold text-sm flex items-center gap-2">
                  <Activity size={16} className="text-emerald-400" />
                  Reports by Status
                </h2>
                {stats.total === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={statusChartData}
                      margin={{ top: 4, right: 8, bottom: 8, left: 0 }}
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#6b7280", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#6b7280", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#0f172a",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          color: "#fff",
                          fontSize: "12px",
                        }}
                        cursor={{ fill: "rgba(255,255,255,0.03)" }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {statusChartData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Category pie chart */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                <h2 className="mb-6 font-semibold text-sm flex items-center gap-2">
                  <BarChart3 size={16} className="text-emerald-400" />
                  Reports by Category
                </h2>
                {categoryChartData.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                      >
                        {categoryChartData.map((_, index) => (
                          <Cell
                            key={index}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#0f172a",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          color: "#fff",
                          fontSize: "12px",
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "11px", color: "#9ca3af" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Status breakdown table */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <h2 className="mb-4 font-semibold text-sm flex items-center gap-2">
                <Clock3 size={16} className="text-white/40" />
                Status Breakdown
              </h2>
              <div className="space-y-3">
                {[
                  { key: "submitted", label: "Submitted" },
                  { key: "under_review", label: "Under Review" },
                  { key: "action_planned", label: "Action Planned" },
                  { key: "in_progress", label: "In Progress" },
                  { key: "resolved", label: "Resolved" },
                  { key: "verified", label: "Verified" },
                ].map(({ key, label }) => {
                  const count = stats[key as keyof Stats] as number;
                  const pct =
                    stats.total > 0
                      ? Math.round((count / stats.total) * 100)
                      : 0;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/70">{label}</span>
                        <span className="text-white/40">
                          {count}{" "}
                          {stats.total > 0 && (
                            <span className="text-xs">({pct}%)</span>
                          )}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            background:
                              STATUS_COLORS_MAP[key] || "#6b7280",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Honest Impact Note */}
            <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.02] p-6">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10">
                  <ShieldCheck size={16} className="text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium text-emerald-300">
                    Honest Impact Reporting
                  </p>
                  <p className="mt-1.5 text-sm text-white/40 leading-relaxed">
                    All metrics shown are sourced directly from the database and reflect
                    real report data. This dashboard shows &quot;Reports Resolved&quot; rather
                    than fabricated environmental savings (such as &quot;tons of CO₂ saved&quot;)
                    because we do not have measurement data to support such claims.
                    Precise environmental impact quantification requires on-site measurement
                    and is out of scope for this prototype.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && !stats && !error && (
          <div className="mt-10 text-center text-white/40">
            No data available yet. Submit your first sustainability report to see metrics.
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-10 border-t border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-xs text-white/30">
          <span>AI Sustainability Discovery Platform</span>
          <span>
            Real data · No fabricated numbers · SDG 11
          </span>
        </div>
      </footer>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: "slate" | "blue" | "emerald" | "teal";
}) {
  const bg: Record<string, string> = {
    slate: "bg-slate-500/10 text-slate-400",
    blue: "bg-blue-500/10 text-blue-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
    teal: "bg-teal-500/10 text-teal-400",
  };

  const val: Record<string, string> = {
    slate: "text-white",
    blue: "text-blue-400",
    emerald: "text-emerald-400",
    teal: "text-teal-400",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className={`mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg ${bg[color]}`}>
        {icon}
      </div>
      <p className={`text-3xl font-bold ${val[color]}`}>{value}</p>
      <p className="mt-1 text-sm font-medium text-white/70">{label}</p>
      <p className="mt-0.5 text-xs text-white/30">{sub}</p>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/10 text-sm text-white/30">
      No data yet — submit reports to see charts
    </div>
  );
}
