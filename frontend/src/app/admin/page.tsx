"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Loader2,
  ArrowLeft,
  ChevronDown,
  ListFilter,
  Eye,
  CheckCircle2,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Report = {
  id: number;
  description: string;
  category: string;
  location: string | null;
  photo_path: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
};

type Analysis = {
  report_id: number;
  priority_score: number | null;
  confidence: number | null;
  category: string | null;
};

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

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  action_planned: "Action Planned",
  in_progress: "In Progress",
  resolved: "Resolved",
  verified: "Verified",
};

const STATUS_COLORS: Record<string, string> = {
  submitted: "text-slate-400 border-slate-500/30 bg-slate-500/10",
  under_review: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  action_planned: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  in_progress: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  resolved: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  verified: "text-teal-400 border-teal-500/30 bg-teal-500/10",
};

// Valid next statuses for each lifecycle state — enforces forward-only transitions in UI
const VALID_NEXT_STATUSES: Record<string, string[]> = {
  submitted:      ["under_review"],
  under_review:   ["action_planned"],
  action_planned: ["in_progress"],
  in_progress:    ["resolved"],
  resolved:       ["verified"],
  verified:       [],  // No further transitions
};

function getValidNextStatuses(currentStatus: string): string[] {
  return VALID_NEXT_STATUSES[currentStatus] ?? [];
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(dateStr);
  }
}

export default function AdminPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [analyses, setAnalyses] = useState<Record<number, Analysis>>({});
  const [stats, setStats] = useState<Stats | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  // Status Change Modal State
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [newStatus, setNewStatus] = useState<string>("under_review");
  const [statusNote, setStatusNote] = useState<string>("");
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [reportsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/reports`, { cache: "no-store" }),
        fetch(`${API_URL}/api/reports/stats`, { cache: "no-store" }),
      ]);

      if (!reportsRes.ok) throw new Error("Failed to load reports");
      if (!statsRes.ok) throw new Error("Failed to load dashboard statistics");

      const reportsData: Report[] = await reportsRes.json();
      const statsData: Stats = await statsRes.json();

      setReports(reportsData);
      setStats(statsData);

      // Fetch analyses for each report in parallel (silently ignore failures)
      const analysisMap: Record<number, Analysis> = {};
      await Promise.all(
        reportsData.map(async (rep) => {
          try {
            const res = await fetch(`${API_URL}/api/reports/${rep.id}/analysis`, { cache: "no-store" });
            if (res.ok) {
              const data = await res.json();
              analysisMap[rep.id] = data;
            }
          } catch {
            // no analysis yet
          }
        })
      );
      setAnalyses(analysisMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading admin panel.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute High Priority Count
  const highPriorityCount = useMemo(() => {
    return Object.values(analyses).filter((a) => (a.priority_score ?? 0) >= 8).length;
  }, [analyses]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // Search
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        r.description.toLowerCase().includes(searchLower) ||
        (r.location && r.location.toLowerCase().includes(searchLower)) ||
        String(r.id).includes(searchLower);

      // Category filter
      const matchesCategory =
        categoryFilter === "All" || r.category.toLowerCase() === categoryFilter.toLowerCase();

      // Status filter
      const matchesStatus = statusFilter === "All" || r.status === statusFilter;

      // Priority filter
      const pScore = analyses[r.id]?.priority_score;
      let matchesPriority = true;
      if (priorityFilter === "High") matchesPriority = (pScore ?? 0) >= 8;
      else if (priorityFilter === "Medium") matchesPriority = (pScore ?? 0) >= 5 && (pScore ?? 0) < 8;
      else if (priorityFilter === "Low") matchesPriority = pScore !== undefined && pScore !== null && pScore < 5;
      else if (priorityFilter === "Unanalyzed") matchesPriority = pScore === undefined || pScore === null;

      return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
    });
  }, [reports, search, categoryFilter, statusFilter, priorityFilter, analyses]);

  // Handle status update
  async function handleStatusUpdateSubmit() {
    if (!activeReport) return;
    setUpdating(true);
    setUpdateMsg(null);

    try {
      const res = await fetch(`${API_URL}/api/reports/${activeReport.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          note: statusNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to update status.");

      setUpdateMsg({ type: "success", text: `Report #${activeReport.id} status updated to ${STATUS_LABELS[newStatus] || newStatus}` });

      // Update local state
      setReports((prev) => prev.map((r) => (r.id === activeReport.id ? data : r)));
      setStatusNote("");

      setTimeout(() => {
        setActiveReport(null);
        setUpdateMsg(null);
      }, 1200);
    } catch (err) {
      setUpdateMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to update status." });
    } finally {
      setUpdating(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Top Header */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-xs text-white/60 hover:text-white transition"
            >
              <ArrowLeft size={16} />
              Impact Dashboard
            </Link>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-400" />
              <h1 className="text-sm font-bold tracking-tight">Admin & Reviewer Panel</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 transition"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Refresh Data
            </button>
            <Link
              href="/report/new"
              className="rounded-lg bg-emerald-400 px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-emerald-300 transition"
            >
              + New Report
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8 space-y-8">

        {/* Responsible AI Human-in-the-Loop Banner */}
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-300">Human Oversight & Operational Decision Panel</p>
              <p className="text-white/60 mt-0.5">
                AI Agent provides priorities and recommendations. Operational status changes (Action Planned, In Progress, Resolved, Verified) require manual human review.
              </p>
            </div>
          </div>
          <div className="shrink-0 font-medium text-[11px] text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20 self-start md:self-auto">
            Reviewer Role Active
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchData} className="underline text-xs">Retry</button>
          </div>
        )}

        {/* Stats Summary Cards */}
        {stats && (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
            {[
              { label: "Total Reports", value: stats.total, color: "text-white bg-white/5 border-white/10" },
              { label: "Submitted", value: stats.submitted, color: "text-slate-300 bg-slate-500/10 border-slate-500/20" },
              { label: "Under Review", value: stats.under_review, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
              { label: "Action Planned", value: stats.action_planned, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
              { label: "In Progress", value: stats.in_progress, color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
              { label: "Resolved", value: stats.resolved, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
              { label: "Verified", value: stats.verified, color: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
              { label: "High Priority", value: highPriorityCount, color: "text-red-400 bg-red-500/10 border-red-500/20" },
            ].map((card) => (
              <div key={card.label} className={`rounded-xl border p-3 text-center ${card.color}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">{card.label}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight">{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Category Distribution Bar */}
        {stats && stats.by_category && Object.keys(stats.by_category).length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white/80 flex items-center gap-2">
                <ListFilter size={14} className="text-emerald-400" />
                Category Distribution
              </span>
              <span className="text-white/40">{Object.keys(stats.by_category).length} Active Categories</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.by_category).map(([cat, count]) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(categoryFilter === cat ? "All" : cat)}
                  className={`rounded-lg border px-3 py-1.5 text-xs flex items-center gap-2 transition ${
                    categoryFilter.toLowerCase() === cat.toLowerCase()
                      ? "border-emerald-400 bg-emerald-400/20 text-emerald-300 font-semibold"
                      : "border-white/10 bg-black/40 text-white/60 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <span>{cat}</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.2 text-[10px] font-mono">{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">

            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search reports by ID, description, or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/50 pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400/50 focus:outline-none"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 text-xs">

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 pr-8 text-xs text-white/80 focus:border-emerald-400/50 focus:outline-none"
                >
                  <option value="All" className="bg-slate-900">All Statuses</option>
                  {Object.entries(STATUS_LABELS).map(([k, label]) => (
                    <option key={k} value={k} className="bg-slate-900">{label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40" />
              </div>

              {/* Priority Filter */}
              <div className="relative">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="appearance-none rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 pr-8 text-xs text-white/80 focus:border-emerald-400/50 focus:outline-none"
                >
                  <option value="All" className="bg-slate-900">All Priorities</option>
                  <option value="High" className="bg-slate-900">High (8-10)</option>
                  <option value="Medium" className="bg-slate-900">Medium (5-7)</option>
                  <option value="Low" className="bg-slate-900">Low (1-4)</option>
                  <option value="Unanalyzed" className="bg-slate-900">Unanalyzed</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40" />
              </div>

              {/* Reset Filters */}
              {(search || categoryFilter !== "All" || statusFilter !== "All" || priorityFilter !== "All") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setCategoryFilter("All");
                    setStatusFilter("All");
                    setPriorityFilter("All");
                  }}
                  className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/50 hover:bg-white/10 hover:text-white transition"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-white/40 border-t border-white/5 pt-3">
            <span>Showing {filteredReports.length} of {reports.length} reports</span>
            {categoryFilter !== "All" && <span>Filtered by Category: <strong>{categoryFilter}</strong></span>}
          </div>
        </div>

        {/* Report Registry Table */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-white/40 gap-2">
              <Loader2 size={18} className="animate-spin text-emerald-400" />
              Loading report registry...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-20 text-center text-white/40 text-xs">
              No sustainability reports match the current filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    <th className="py-3.5 px-4">ID</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Description / Location</th>
                    <th className="py-3.5 px-4">AI Priority</th>
                    <th className="py-3.5 px-4">Confidence</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Created</th>
                    <th className="py-3.5 px-4">Photo</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-normal">
                  {filteredReports.map((report) => {
                    const analysis = analyses[report.id];
                    const priorityScore = analysis?.priority_score;
                    const confidence = analysis?.confidence;

                    return (
                      <tr key={report.id} className="hover:bg-white/[0.02] transition">
                        {/* ID */}
                        <td className="py-4 px-4 font-mono font-medium text-white/80">
                          #{report.id}
                        </td>

                        {/* Category */}
                        <td className="py-4 px-4">
                          <span className="rounded-full bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                            {report.category}
                          </span>
                        </td>

                        {/* Description / Location */}
                        <td className="py-4 px-4 max-w-xs">
                          <p className="font-medium text-white/90 line-clamp-2">{report.description}</p>
                          {report.location && (
                            <p className="mt-1 text-[11px] text-white/40 flex items-center gap-1">
                              <span>📍</span> {report.location}
                            </p>
                          )}
                        </td>

                        {/* AI Priority */}
                        <td className="py-4 px-4">
                          {priorityScore !== undefined && priorityScore !== null ? (
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                                priorityScore >= 8
                                  ? "text-red-400 bg-red-500/10 border-red-500/20"
                                  : priorityScore >= 5
                                  ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                                  : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                              }`}
                            >
                              {priorityScore}/10 {priorityScore >= 8 ? "HIGH" : priorityScore >= 5 ? "MED" : "LOW"}
                            </span>
                          ) : (
                            <span className="text-white/30 italic">Not Analyzed</span>
                          )}
                        </td>

                        {/* Confidence */}
                        <td className="py-4 px-4">
                          {confidence !== undefined && confidence !== null ? (
                            <span className="font-mono text-white/70">
                              {Math.round(confidence * 100)}%
                            </span>
                          ) : (
                            <span className="text-white/30">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${
                              STATUS_COLORS[report.status] || "text-white/50 border-white/10"
                            }`}
                          >
                            {STATUS_LABELS[report.status] || report.status}
                          </span>
                        </td>

                        {/* Created */}
                        <td className="py-4 px-4 text-white/40 text-[11px]">
                          {formatDate(report.created_at)}
                        </td>

                        {/* Photo */}
                        <td className="py-4 px-4">
                          {report.photo_path ? (
                            <span className="text-emerald-400 font-medium text-[11px] flex items-center gap-1">
                              📷 Photo
                            </span>
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              const validNext = getValidNextStatuses(report.status);
                              setActiveReport(report);
                              setNewStatus(validNext.length > 0 ? validNext[0] : report.status);
                              setStatusNote("");
                              setUpdateMsg(null);
                            }}
                            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-white/10 transition"
                          >
                            Update Status
                          </button>
                          <Link
                            href={`/report/${report.id}`}
                            className="rounded-lg bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-400/20 transition inline-flex items-center gap-1"
                          >
                            <Eye size={12} />
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </section>

      {/* Status Change Modal */}
      {activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="font-bold text-sm text-white">Update Status — Report #{activeReport.id}</h3>
              <button
                onClick={() => setActiveReport(null)}
                className="text-white/40 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div>
              <p className="text-xs text-white/60 line-clamp-2">{activeReport.description}</p>
              <p className="text-[11px] text-white/40 mt-1">Current Status: <strong className="text-emerald-300">{STATUS_LABELS[activeReport.status] || activeReport.status}</strong></p>
            </div>

            {/* Target Status Select — only valid next statuses shown (Task 7) */}
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">
                New Operational Status
              </label>
              {getValidNextStatuses(activeReport.status).length > 0 ? (
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-2.5 text-xs text-white focus:border-emerald-400/50 focus:outline-none"
                >
                  {getValidNextStatuses(activeReport.status).map((k) => (
                    <option key={k} value={k} className="bg-slate-900">
                      {STATUS_LABELS[k] || k}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 px-4 py-3 text-xs text-teal-300">
                  ✓ This report is <strong>Verified</strong> and closed. No further status transitions are permitted.
                </div>
              )}
            </div>

            {/* Note Input */}
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">
                Action Note / Inspector Comment (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Sanitation team notified for inspection."
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-2.5 text-xs text-white placeholder-white/30 focus:border-emerald-400/50 focus:outline-none"
              />
            </div>

            {updateMsg && (
              <div
                className={`rounded-xl p-3 text-xs flex items-center gap-2 ${
                  updateMsg.type === "success"
                    ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                    : "bg-red-400/10 text-red-400 border border-red-400/20"
                }`}
              >
                {updateMsg.text}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-4">
              <button
                onClick={() => setActiveReport(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-white/60 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdateSubmit}
                disabled={updating || newStatus === activeReport.status || getValidNextStatuses(activeReport.status).length === 0}
                className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-semibold text-black hover:bg-emerald-300 disabled:opacity-40 flex items-center gap-1.5"
              >
                {updating ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 border-t border-white/10 py-6 text-center text-xs text-white/30">
        AI Sustainability Discovery Platform · Admin Panel · Responsible AI Human-in-the-Loop
      </footer>
    </main>
  );
}
