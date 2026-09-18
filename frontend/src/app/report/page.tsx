"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  RefreshCw,
  Plus,
  MapPin,
  Clock3,
  Image as ImageIcon,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Activity,
  Filter,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Report = {
  id: number;
  description: string;
  category: string;
  location: string | null;
  photo_path: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  action_planned: "Action Planned",
  in_progress: "In Progress",
  resolved: "Resolved",
  verified: "Verified",
};

const STATUS_BADGE: Record<string, string> = {
  submitted: "text-slate-400 border-slate-500/30 bg-slate-500/10",
  under_review: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  action_planned: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  in_progress: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  resolved: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  verified: "text-teal-400 border-teal-500/30 bg-teal-500/10",
};

const ALL_STATUSES = [
  "submitted",
  "under_review",
  "action_planned",
  "in_progress",
  "resolved",
  "verified",
];

export default function ReportsPage() {
  const router = useRouter();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  async function fetchReports() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/reports`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load reports.");
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Invalid response from server.");
      }

      setReports(data);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
      setError(
        err instanceof Error ? err.message : "Unable to connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, []);

  function formatDate(dateString: string) {
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  }

  function getPhotoUrl(photoPath: string | null) {
    if (!photoPath) return null;
    const cleanPath = photoPath.replace(/\\/g, "/").replace(/^\/+/, "");
    const cleanApiUrl = API_URL.replace(/\/+$/, "");
    return `${cleanApiUrl}/${cleanPath}`;
  }

  // Stats
  const statusCounts = ALL_STATUSES.reduce(
    (acc, s) => {
      acc[s] = reports.filter((r) => r.status === s).length;
      return acc;
    },
    {} as Record<string, number>
  );

  const filteredReports =
    statusFilter === "all"
      ? reports
      : reports.filter((r) => r.status === statusFilter);

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="text-emerald-400">✦</span>
            AI Sustainability Discovery
          </div>
        </div>
      </header>

      {/* Main */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        {/* Heading */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-xs font-medium text-emerald-400">
              <FileText size={14} />
              Sustainability Reports
            </div>

            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Reported Problems
            </h1>

            <p className="mt-3 max-w-2xl text-base text-white/50">
              Sustainability issues reported by the community. Each report is
              analyzed by AI and tracked through to resolution.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchReports}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              onClick={() => router.push("/report/new")}
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              <Plus size={17} />
              New Report
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-10 grid gap-3 grid-cols-3 sm:grid-cols-6">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() =>
                setStatusFilter(statusFilter === s ? "all" : s)
              }
              className={`rounded-xl border p-4 text-left transition ${
                statusFilter === s
                  ? "border-emerald-400/40 bg-emerald-400/10"
                  : "border-white/10 bg-white/[0.025] hover:border-white/20"
              }`}
            >
              <p className="text-xs text-white/40 truncate">
                {STATUS_LABELS[s]}
              </p>
              <p
                className={`mt-1.5 text-2xl font-semibold ${
                  statusFilter === s ? "text-emerald-400" : "text-white"
                }`}
              >
                {loading ? "—" : statusCounts[s] || 0}
              </p>
            </button>
          ))}
        </div>

        {/* Active filter indicator */}
        {statusFilter !== "all" && (
          <div className="mt-4 flex items-center gap-2">
            <Filter size={14} className="text-emerald-400" />
            <span className="text-sm text-emerald-400">
              Showing: {STATUS_LABELS[statusFilter]}
            </span>
            <button
              onClick={() => setStatusFilter("all")}
              className="ml-2 text-xs text-white/40 underline hover:text-white"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Summary stats row */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-white/40">
              Total Reports
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {loading ? "—" : reports.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-white/40">
              Active (Under Review / In Progress)
            </p>
            <p className="mt-2 text-3xl font-semibold text-blue-400">
              {loading
                ? "—"
                : (statusCounts.under_review || 0) +
                  (statusCounts.action_planned || 0) +
                  (statusCounts.in_progress || 0)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-white/40">
              Resolved & Verified
            </p>
            <p className="mt-2 text-3xl font-semibold text-emerald-400">
              {loading
                ? "—"
                : (statusCounts.resolved || 0) +
                  (statusCounts.verified || 0)}
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/5 p-5">
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0 text-red-400"
            />
            <div>
              <p className="font-medium text-red-300">
                Unable to load reports
              </p>
              <p className="mt-1 text-sm text-red-300/60">{error}</p>
              <button
                onClick={fetchReports}
                className="mt-3 text-sm font-medium text-red-300 underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && !error && (
          <div className="mt-8 grid gap-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.025] p-6"
              >
                <div className="h-4 w-24 rounded bg-white/10" />
                <div className="mt-5 h-5 w-3/4 rounded bg-white/10" />
                <div className="mt-3 h-4 w-1/2 rounded bg-white/5" />
                <div className="mt-6 h-4 w-40 rounded bg-white/5" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredReports.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-6 py-20 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
              <FileText size={30} className="text-white/30" />
            </div>

            <h2 className="mt-6 text-xl font-semibold">
              {statusFilter === "all"
                ? "No reports yet"
                : `No ${STATUS_LABELS[statusFilter]} reports`}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/40">
              {statusFilter === "all"
                ? "Be the first person to report a sustainability problem and help create useful real-world data."
                : "No reports currently have this status. Try a different filter."}
            </p>

            {statusFilter === "all" ? (
              <button
                onClick={() => router.push("/report/new")}
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                <Plus size={17} />
                Submit First Report
              </button>
            ) : (
              <button
                onClick={() => setStatusFilter("all")}
                className="mt-7 inline-flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                Clear Filter
              </button>
            )}
          </div>
        )}

        {/* Reports List */}
        {!loading && !error && filteredReports.length > 0 && (
          <div className="mt-8 space-y-4">
            {filteredReports.map((report) => {
              const photoUrl = getPhotoUrl(report.photo_path);

              return (
                <button
                  key={report.id}
                  onClick={() => router.push(`/report/${report.id}`)}
                  className="group w-full rounded-2xl border border-white/10 bg-white/[0.025] p-6 text-left transition hover:border-emerald-400/20 hover:bg-white/[0.04]"
                >
                  <div className="flex flex-col gap-6 md:flex-row">
                    {/* Photo */}
                    {photoUrl && (
                      <div className="h-28 w-full shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black md:h-28 md:w-40">
                        <img
                          src={photoUrl}
                          alt="Report evidence"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-1 text-xs font-medium text-emerald-400">
                          {report.category}
                        </span>

                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/40">
                          #{report.id}
                        </span>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                            STATUS_BADGE[report.status] ||
                            "border-white/10 text-white/40"
                          }`}
                        >
                          {STATUS_LABELS[report.status] || report.status}
                        </span>
                      </div>

                      <h2 className="mt-4 line-clamp-2 text-lg font-semibold text-white">
                        {report.description}
                      </h2>

                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/40">
                        {report.location && (
                          <span className="flex items-center gap-1.5">
                            <MapPin size={14} />
                            {report.location}
                          </span>
                        )}

                        <span className="flex items-center gap-1.5">
                          <Clock3 size={14} />
                          {formatDate(report.created_at)}
                        </span>

                        {report.photo_path && (
                          <span className="flex items-center gap-1.5 text-emerald-400/70">
                            <ImageIcon size={14} />
                            Evidence attached
                          </span>
                        )}

                        {report.status === "resolved" ||
                        report.status === "verified" ? (
                          <span className="flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 size={14} />
                            {report.status === "verified"
                              ? "Verified"
                              : "Resolved"}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-blue-400/70">
                            <Activity size={14} />
                            Active
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center justify-end md:justify-center">
                      <ChevronRight
                        size={20}
                        className="text-white/20 transition group-hover:translate-x-1 group-hover:text-emerald-400"
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-20 border-t border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-white/30">
          <span>AI Sustainability Discovery Platform</span>
          <span>Responsible AI · SDG 11 · Data-driven Impact</span>
        </div>
      </footer>
    </main>
  );
}