"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Brain,
  Image as ImageIcon,
  RefreshCw,
  Zap,
  ShieldCheck,
  History,
  ChevronDown,
  Loader2,
  AlertTriangle,
  TrendingUp,
  BookOpen,
  FileText,
  Info,
  Bot,
  Wrench,
  ListChecks,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// ─── Types ───────────────────────────────────────

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

type RetrievedSource = {
  source: string;
  title?: string;
  score?: number;
  content?: string;
};

type Analysis = {
  id: number;
  report_id: number;
  category: string | null;
  priority_score: number | null;
  confidence: number | null;
  root_cause: string | null;
  recommended_action: string | null;
  impact_estimate: string | null;
  model_name: string | null;
  retrieved_sources?: RetrievedSource[] | string | null;
  created_at: string;
};

type AgentToolResult = {
  tool: string;
  status: string;
  result_summary: string;
};

type AgentAnalysis = Analysis & {
  agent_selected_tools?: string[] | string | null;
  agent_reasoning?: string | null;
  agent_tool_results?: AgentToolResult[] | string | null;
};

// Friendly display names for agent tools
const TOOL_LABELS: Record<string, { label: string; icon: string }> = {
  get_report:          { label: "Read Report Information",          icon: "📄" },
  retrieve_knowledge:  { label: "Retrieved Sustainability Knowledge", icon: "📚" },
  get_report_history:  { label: "Reviewed Report Status History",    icon: "🕐" },
  get_dashboard_stats: { label: "Checked Campus Community Statistics",icon: "📊" },
};

function parseAgentTools(v: string[] | string | null | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
}

function parseAgentToolResults(v: AgentToolResult[] | string | null | undefined): AgentToolResult[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
}

type HistoryEntry = {
  id: number;
  report_id: number;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  note: string | null;
};

type ReportDetailPageProps = {
  params: Promise<{ id: string }>;
};

// ─── Constants ───────────────────────────────────

const STATUSES = [
  "submitted",
  "under_review",
  "action_planned",
  "in_progress",
  "resolved",
  "verified",
] as const;

type StatusKey = (typeof STATUSES)[number];

const STATUS_LABELS: Record<StatusKey, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  action_planned: "Action Planned",
  in_progress: "In Progress",
  resolved: "Resolved",
  verified: "Verified",
};

const STATUS_COLORS: Record<StatusKey, string> = {
  submitted: "text-slate-400 border-slate-500/30 bg-slate-500/10",
  under_review: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  action_planned: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  in_progress: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  resolved: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  verified: "text-teal-400 border-teal-500/30 bg-teal-500/10",
};

// ─── Helpers ─────────────────────────────────────

function formatDate(dateString?: string | null) {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return String(dateString);
  }
}

function getPhotoUrl(photoPath: string | null) {
  if (!photoPath) return null;
  const cleanPath = photoPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const cleanApiUrl = API_URL.replace(/\/+$/, "");
  return `${cleanApiUrl}/${cleanPath}`;
}

function getPriorityLabel(score: number): { label: string; color: string } {
  if (score >= 8) return { label: "HIGH", color: "text-red-400 bg-red-500/10 border-red-500/20" };
  if (score >= 5) return { label: "MEDIUM", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
  return { label: "LOW", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
}

function parseSources(retrieved_sources?: RetrievedSource[] | string | null): RetrievedSource[] {
  if (!retrieved_sources) return [];
  if (Array.isArray(retrieved_sources)) return retrieved_sources;
  if (typeof retrieved_sources === "string") {
    try {
      const parsed = JSON.parse(retrieved_sources);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

// ─── Page Component ───────────────────────────────

export default function ReportDetailPage({ params }: ReportDetailPageProps) {
  const router = useRouter();
  const { id } = use(params);

  const [report, setReport] = useState<Report | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [imageError, setImageError] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StatusKey>("submitted");

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");

  // ─── Agent state ──────────────────────────────
  const [agentAnalysis, setAgentAnalysis] = useState<AgentAnalysis | null>(null);
  const [agentAnalyzing, setAgentAnalyzing] = useState(false);
  const [agentError, setAgentError] = useState("");

  // ─── Data loading ─────────────────────────────

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [reportRes, analysisRes, historyRes] = await Promise.all([
        fetch(`${API_URL}/api/reports/${id}`, { cache: "no-store" }),
        fetch(`${API_URL}/api/reports/${id}/analysis`, { cache: "no-store" }),
        fetch(`${API_URL}/api/reports/${id}/history`, { cache: "no-store" }),
      ]);

      if (!reportRes.ok) {
        const data = await reportRes.json().catch(() => ({}));
        throw new Error(
          typeof data.detail === "string" ? data.detail : "Failed to load report."
        );
      }

      const reportData: Report = await reportRes.json();
      setReport(reportData);
      setSelectedStatus(reportData.status as StatusKey);

      if (analysisRes.ok) {
        setAnalysis(await analysisRes.json());
      }

      if (historyRes.ok) {
        setHistory(await historyRes.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load report.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // ─── Status update ────────────────────────────

  async function handleStatusUpdate() {
    if (!report || selectedStatus === report.status) return;

    setStatusUpdating(true);
    setStatusError("");
    setStatusSuccess("");

    try {
      const res = await fetch(`${API_URL}/api/reports/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          typeof data.detail === "string" ? data.detail : "Failed to update status."
        );
      }

      setReport(data);
      setStatusSuccess(`Status updated to: ${STATUS_LABELS[selectedStatus]}`);

      // Reload history
      const historyRes = await fetch(`${API_URL}/api/reports/${id}/history`, { cache: "no-store" });
      if (historyRes.ok) setHistory(await historyRes.json());

      setTimeout(() => setStatusSuccess(""), 3000);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setStatusUpdating(false);
    }
  }

  // ─── AI Analysis ──────────────────────────────

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError("");

    try {
      const res = await fetch(`${API_URL}/api/reports/${id}/analyze`, {
        method: "POST",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          typeof data.detail === "string" ? data.detail : "AI analysis failed."
        );
      }

      setAnalysis(data);
    } catch (err) {
      setAnalyzeError(
        err instanceof Error ? err.message : "AI analysis service unavailable."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  // ─── AI Agent Analysis ────────────────────────

  async function handleAgentAnalyze() {
    setAgentAnalyzing(true);
    setAgentError("");

    try {
      const res = await fetch(`${API_URL}/api/reports/${id}/agent-analyze`, {
        method: "POST",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          typeof data.detail === "string" ? data.detail : "Agent analysis failed."
        );
      }

      setAgentAnalysis(data as AgentAnalysis);
    } catch (err) {
      setAgentError(
        err instanceof Error ? err.message : "AI agent service unavailable."
      );
    } finally {
      setAgentAnalyzing(false);
    }
  }

  // ─── Loading state ────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <PageHeader onBack={() => router.push("/report")} />
        <section className="mx-auto max-w-4xl px-6 py-14">
          <div className="animate-pulse space-y-6">
            <div className="h-6 w-32 rounded bg-white/10" />
            <div className="h-12 w-3/4 rounded bg-white/10" />
            <div className="h-4 w-1/2 rounded bg-white/5" />
            <div className="h-64 rounded-2xl bg-white/5" />
          </div>
        </section>
      </main>
    );
  }

  // ─── Error state ──────────────────────────────

  if (error || !report) {
    return (
      <main className="min-h-screen bg-black text-white">
        <PageHeader onBack={() => router.push("/report")} />
        <section className="mx-auto flex min-h-[65vh] max-w-2xl items-center justify-center px-6">
          <div className="w-full rounded-2xl border border-red-400/20 bg-red-400/5 p-8 text-center">
            <AlertCircle size={36} className="mx-auto text-red-400" />
            <h1 className="mt-5 text-2xl font-bold">Unable to load report</h1>
            <p className="mt-3 text-sm text-red-300/60">{error || "Report not found."}</p>
            <div className="mt-7 flex justify-center gap-3">
              <button
                onClick={loadReport}
                className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-medium transition hover:bg-white/10"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
              <button
                onClick={() => router.push("/report")}
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                View Reports
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const photoUrl = getPhotoUrl(report.photo_path);
  const currentStatusIndex = STATUSES.indexOf(report.status as StatusKey);

  // ─── Main render ──────────────────────────────

  return (
    <main className="min-h-screen bg-black text-white">
      <PageHeader onBack={() => router.push("/report")} />

      <section className="mx-auto max-w-4xl px-6 py-14 space-y-8">

        {/* ─ Title ─ */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-xs font-medium text-emerald-400">
              {report.category}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/40">
              Report #{report.id}
            </span>
            <span
              className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize ${
                STATUS_COLORS[report.status as StatusKey] || "text-white/50"
              }`}
            >
              {STATUS_LABELS[report.status as StatusKey] || report.status}
            </span>
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
            {report.description}
          </h1>

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/40">
            {report.location && (
              <span className="flex items-center gap-2">
                <MapPin size={16} />
                {report.location}
              </span>
            )}
            <span className="flex items-center gap-2">
              <Clock3 size={16} />
              Submitted {formatDate(report.created_at)}
            </span>
          </div>
        </div>

        {/* ─ Status Timeline ─ */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
          <h2 className="mb-6 font-semibold flex items-center gap-2">
            <History size={18} className="text-emerald-400" />
            Status Timeline
          </h2>

          <div className="relative">
            {/* Progress track */}
            <div className="absolute left-4 top-0 h-full w-px bg-white/10" />

            <div className="space-y-4">
              {STATUSES.map((status, index) => {
                const isDone = index < currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                const isPending = index > currentStatusIndex;

                const historyEntry = history.find(
                  (h) => h.new_status === status
                );

                return (
                  <div key={status} className="relative flex items-start gap-4 pl-10">
                    {/* Node */}
                    <div
                      className={`absolute left-0 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                        isDone
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                          : isCurrent
                          ? "border-emerald-400 bg-emerald-400/10 text-emerald-400"
                          : "border-white/10 bg-black text-white/20"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 size={16} />
                      ) : isCurrent ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      ) : (
                        <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="pb-4">
                      <p
                        className={`text-sm font-medium ${
                          isPending ? "text-white/30" : "text-white"
                        }`}
                      >
                        {STATUS_LABELS[status]}
                        {isCurrent && (
                          <span className="ml-2 rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-400">
                            Current
                          </span>
                        )}
                      </p>
                      {historyEntry && (
                        <p className="mt-0.5 text-xs text-white/30">
                          {formatDate(historyEntry.changed_at)}
                          {historyEntry.note && ` · ${historyEntry.note}`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Update Controls */}
          <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="mb-3 text-xs font-medium text-white/50 uppercase tracking-wider">
              Update Status
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as StatusKey)}
                  className="w-full appearance-none rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-400/50 pr-8"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-slate-900">
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
                />
              </div>

              <button
                onClick={handleStatusUpdate}
                disabled={statusUpdating || selectedStatus === report.status}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {statusUpdating ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                {statusUpdating ? "Updating…" : "Update Status"}
              </button>
            </div>

            {statusSuccess && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-400">
                <CheckCircle2 size={14} />
                {statusSuccess}
              </p>
            )}
            {statusError && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-red-400">
                <AlertCircle size={14} />
                {statusError}
              </p>
            )}
          </div>
        </div>

        {/* ─ Evidence ─ */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
          <div className="flex items-center gap-2">
            <ImageIcon size={18} className="text-emerald-400" />
            <h2 className="font-semibold">Evidence</h2>
          </div>

          {photoUrl && !imageError ? (
            <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-black/60">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs text-white/50">
                <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                  <CheckCircle2 size={14} />
                  User-Provided Photo Evidence
                </span>
                <a
                  href={photoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/60 underline hover:text-white"
                >
                  Open Original
                </a>
              </div>
              <div className="flex items-center justify-center p-3">
                <img
                  src={photoUrl}
                  alt="Sustainability report evidence"
                  className="max-h-[500px] w-full rounded-lg object-contain"
                  onError={() => setImageError(true)}
                />
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
              <ImageIcon size={30} className="mx-auto text-white/20" />
              <p className="mt-3 text-sm text-white/40">
                {imageError
                  ? "Unable to load evidence image."
                  : "No photo evidence was attached to this report."}
              </p>
            </div>
          )}

          <p className="mt-3 text-xs text-white/25 italic">
            User-provided evidence. AI interpretation (if shown below) is separate from this evidence.
          </p>
        </div>

        {/* ─ Report Information ─ */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
          <h2 className="font-semibold">Report Information</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/30">Category</p>
              <p className="mt-2 text-sm font-medium">{report.category}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-white/30">Location</p>
              <p className="mt-2 text-sm font-medium">
                {report.location || "Not specified"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-white/30">Last Updated</p>
              <p className="mt-2 text-sm font-medium">{formatDate(report.updated_at)}</p>
            </div>
          </div>
        </div>

        {/* ─ AI Analysis ─ */}
        <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.025] p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10">
                <Brain size={20} className="text-emerald-400" />
              </div>
              <div>
                <h2 className="font-semibold">AI Analysis</h2>
                <p className="text-xs text-white/35">AI-assisted sustainability intelligence</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Existing RAG+AI analysis button */}
              <button
                id="btn-run-analysis"
                onClick={handleAnalyze}
                disabled={analyzing || agentAnalyzing}
                className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {analyzing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Zap size={16} />
                )}
                {analyzing
                  ? "Analyzing…"
                  : analysis
                  ? "Re-run Analysis"
                  : "Run AI Analysis"}
              </button>

              {/* New agentic AI analysis button */}
              <button
                id="btn-run-agent-analysis"
                onClick={handleAgentAnalyze}
                disabled={agentAnalyzing || analyzing}
                className="flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-400/10 px-4 py-2.5 text-sm font-medium text-violet-300 transition hover:bg-violet-400/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {agentAnalyzing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Bot size={16} />
                )}
                {agentAnalyzing
                  ? "Agent Running…"
                  : agentAnalysis
                  ? "Re-run AI Agent"
                  : "Run AI Agent Analysis"}
              </button>
            </div>
          </div>

          {analyzeError && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {analyzeError}
            </div>
          )}

          {analysis ? (() => {
            const retrievedSourcesList = parseSources(analysis.retrieved_sources);
            return (
            <div className="mt-6 space-y-4">
              {/* Low confidence or weak retrieval warning */}
              {(analysis.confidence !== null && analysis.confidence < 0.6 || retrievedSourcesList.length === 0) && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs text-amber-300">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold">Limited supporting knowledge was retrieved.</span> Human review recommended before operational action.
                  </div>
                </div>
              )}

              {/* Priority + Confidence */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                  <p className="text-xs uppercase tracking-wider text-white/30">
                    AI-Assisted Priority
                  </p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">
                      {analysis.priority_score ?? "—"}
                    </span>
                    <span className="text-white/30">/10</span>
                    {analysis.priority_score && (
                      <span
                        className={`ml-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          getPriorityLabel(analysis.priority_score).color
                        }`}
                      >
                        {getPriorityLabel(analysis.priority_score).label}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-white/30">
                    AI-assisted score based on category, description, and keywords. Not a verified operational assessment.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                  <p className="text-xs uppercase tracking-wider text-white/30">
                    AI Confidence
                  </p>
                  {analysis.confidence !== null && analysis.confidence !== undefined ? (
                    <>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-white">
                          {Math.round(analysis.confidence * 100)}
                        </span>
                        <span className="text-white/30">%</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            analysis.confidence >= 0.8
                              ? "bg-emerald-400"
                              : analysis.confidence >= 0.6
                              ? "bg-amber-400"
                              : "bg-red-400"
                          }`}
                          style={{ width: `${analysis.confidence * 100}%` }}
                        />
                      </div>
                      {analysis.confidence < 0.7 && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
                          <AlertTriangle size={12} />
                          Human review recommended
                        </div>
                      )}
                      <p className="mt-2 text-xs text-white/30">
                        Reflects AI model confidence. Not a guarantee of accuracy.
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 text-lg text-white/40">—</p>
                  )}
                </div>
              </div>

              {/* Root Cause */}
              <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-wider text-white/30">
                  Probable Root Cause
                </p>
                <p className="mt-3 text-sm leading-relaxed text-white/80">
                  {analysis.root_cause || "Unable to determine root cause."}
                </p>
                <p className="mt-2 text-xs text-white/25 italic">
                  "Probable" — AI interpretation, not verified diagnosis.
                </p>
              </div>

              {/* Recommended Action */}
              <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-wider text-white/30">
                  Recommended Action
                </p>
                <p className="mt-3 text-sm leading-relaxed text-white/80">
                  {analysis.recommended_action || "No recommendation available."}
                </p>
              </div>

              {/* Impact Estimate */}
              <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                <div className="flex items-center gap-2">
                  <TrendingUp size={15} className="text-teal-400" />
                  <p className="text-xs uppercase tracking-wider text-white/30">
                    Impact Estimate
                  </p>
                  <span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-xs text-teal-400">
                    Qualitative
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-white/80">
                  {analysis.impact_estimate ||
                    "Impact assessment requires further data."}
                </p>
                <p className="mt-2 text-xs text-white/25 italic">
                  Qualitative estimate only. Precise environmental impact data is not available without measurement.
                </p>
              </div>

              {/* ─ Knowledge Used (RAG Sources) ─ */}
              {retrievedSourcesList.length > 0 && (
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-5">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} className="text-emerald-400" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                        Knowledge Used
                      </p>
                    </div>
                    <span className="text-[11px] text-emerald-300/60 font-medium">
                      Retrieved from the project&apos;s sustainability knowledge base.
                    </span>
                  </div>

                  <div className="space-y-3">
                    {retrievedSourcesList.map((src, idx) => {
                      const isCampusSurvey = src.source === "campus-survey.md";
                      const relevancePct = src.score !== undefined
                        ? Math.round(src.score * 100)
                        : null;
                      // Show first ~280 chars of content as excerpt
                      const excerpt = src.content
                        ? src.content.replace(/^#+\s.*?\n/, "").trim().slice(0, 280)
                        : null;

                      return (
                        <div
                          key={idx}
                          className={`rounded-lg border p-3.5 text-xs ${
                            isCampusSurvey
                              ? "border-amber-400/25 bg-amber-400/5"
                              : "border-white/10 bg-black/40"
                          }`}
                        >
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 font-medium">
                              <span className="text-white/40 tabular-nums shrink-0">
                                {idx + 1}.
                              </span>
                              <FileText
                                size={13}
                                className={isCampusSurvey ? "text-amber-400" : "text-emerald-300"}
                              />
                              <span className={isCampusSurvey ? "text-amber-300" : "text-emerald-300"}>
                                {src.source}
                              </span>
                              {isCampusSurvey && (
                                <span className="ml-1 rounded-full bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300 shrink-0">
                                  📋 Campus Survey Evidence
                                </span>
                              )}
                            </div>
                            {relevancePct !== null && (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0 ${
                                  isCampusSurvey
                                    ? "bg-amber-400/10 text-amber-400"
                                    : "bg-emerald-400/10 text-emerald-400"
                                }`}
                              >
                                Relevance: {relevancePct}%
                              </span>
                            )}
                          </div>

                          {/* Section label */}
                          {src.title && (
                            <p className="mt-1.5 text-[11px] text-white/40">
                              <span className="text-white/25">Section:</span>{" "}
                              <span className="text-white/55">{src.title}</span>
                            </p>
                          )}

                          {/* Evidence excerpt */}
                          {excerpt && (
                            <div className="mt-2">
                              <p className="text-[10px] uppercase tracking-wider text-white/25 mb-1">
                                Evidence:
                              </p>
                              <p className="text-white/55 leading-relaxed font-mono text-[11px] bg-white/[0.02] p-2 rounded border border-white/5 whitespace-pre-wrap line-clamp-4">
                                {excerpt}
                                {src.content && src.content.length > 280 && (
                                  <span className="text-white/25"> …</span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─ What is RAG? Card ─ */}
              <div className="rounded-xl border border-blue-400/20 bg-blue-500/5 p-4 text-xs">
                <div className="flex items-center gap-2 font-semibold text-blue-400 mb-1">
                  <Info size={14} />
                  What is RAG?
                </div>
                <p className="text-white/60 leading-relaxed">
                  RAG retrieves relevant sustainability knowledge from the project&apos;s knowledge base before AI generates its analysis. This helps ground recommendations in documented project knowledge rather than relying only on the model&apos;s general knowledge.
                  {" "}<span className="text-amber-300/70">Sources labelled <strong>Campus Survey Evidence</strong> contain observations reported by real campus survey respondents.</span>
                </p>
              </div>


              {/* Model info */}
              {analysis.model_name && (
                <div className="text-xs text-white/30 space-y-1">
                  <p>Analysis by: <span className="text-white/50">{analysis.model_name}</span> · {formatDate(analysis.created_at)}</p>
                  {analysis.model_name.includes("Simulated") && (
                    <p className="text-amber-400/70 text-[11px]">Live AI provider is not configured.</p>
                  )}
                </div>
              )}
            </div>
          );
          })() : (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {["Priority Score", "Root Cause", "Recommended Action"].map((label) => (
                <div key={label} className="rounded-xl border border-white/10 bg-black/20 p-5">
                  <p className="text-xs uppercase tracking-wider text-white/30">{label}</p>
                  <p className="mt-3 text-sm font-medium text-white/40">Awaiting analysis</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4 text-xs leading-5 text-white/35">
            AI analysis classifies the problem, identifies possible patterns and root causes,
            estimates priority, and suggests evidence-based actions.{" "}
            <strong className="text-white/50">
              Final operational decisions must remain human-approved.
            </strong>
          </div>
        </div>

        {/* ─ AI Agent Analysis Card ─ */}
        {(agentAnalysis || agentAnalyzing || agentError) && (
          <div className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.025] p-6 space-y-5">

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/10">
                <Bot size={20} className="text-violet-400" />
              </div>
              <div>
                <h2 className="font-semibold">🤖 AI Agent Analysis</h2>
                <p className="text-xs text-white/35">Agentic AI with tool selection · RAG-grounded evidence</p>
              </div>
            </div>

            {/* Loading state */}
            {agentAnalyzing && (
              <div className="flex items-center gap-3 rounded-xl border border-violet-400/20 bg-violet-400/5 p-4 text-sm text-violet-300">
                <Loader2 size={16} className="animate-spin shrink-0" />
                Agent is selecting tools and gathering evidence…
              </div>
            )}

            {/* Error state */}
            {agentError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {agentError}
              </div>
            )}

            {agentAnalysis && (() => {
              const selectedTools = parseAgentTools(agentAnalysis.agent_selected_tools);
              const toolResults  = parseAgentToolResults(agentAnalysis.agent_tool_results);
              const agentSources = parseSources(agentAnalysis.retrieved_sources);

              return (
                <>
                  {/* Selected tools summary */}
                  <div className="rounded-xl border border-violet-400/15 bg-violet-400/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ListChecks size={14} className="text-violet-400" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Selected Tools</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedTools.map((tool) => (
                        <span
                          key={tool}
                          className="flex items-center gap-1.5 rounded-full border border-violet-400/25 bg-violet-400/10 px-3 py-1 text-xs font-medium text-violet-300"
                        >
                          <span>{TOOL_LABELS[tool]?.icon ?? "🔧"}</span>
                          {TOOL_LABELS[tool]?.label ?? tool}
                        </span>
                      ))}
                    </div>
                    {agentAnalysis.agent_reasoning && (
                      <p className="mt-3 text-[11px] text-white/40 leading-relaxed border-t border-white/5 pt-3">
                        <span className="text-white/25">Reasoning: </span>
                        {agentAnalysis.agent_reasoning}
                      </p>
                    )}
                  </div>

                  {/* Agent Activity log */}
                  {toolResults.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Wrench size={13} className="text-white/40" />
                        <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Agent Activity</p>
                      </div>
                      <ol className="space-y-2">
                        {toolResults.map((tr, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-400/15 text-violet-400 font-semibold text-[10px]">
                              {idx + 1}
                            </span>
                            <span className="flex-1">
                              <span className="font-medium text-white/70">
                                {TOOL_LABELS[tr.tool]?.icon ?? "🔧"}{" "}
                                {TOOL_LABELS[tr.tool]?.label ?? tr.tool}
                              </span>
                              <span className="ml-2 text-white/35">{tr.result_summary}</span>
                            </span>
                            <span className={`shrink-0 text-[10px] font-medium ${
                              tr.status === "success" ? "text-emerald-400" : "text-amber-400"
                            }`}>
                              {tr.status === "success" ? "✓" : "⚠"}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Low confidence warning */}
                  {agentAnalysis.confidence !== null && (agentAnalysis.confidence ?? 1) < 0.6 && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs text-amber-300">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold">Limited supporting evidence was retrieved.</span>{" "}
                        Human review recommended before operational action.
                      </div>
                    </div>
                  )}

                  {/* Priority + Confidence */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                      <p className="text-xs uppercase tracking-wider text-white/30">AI Priority Score</p>
                      {agentAnalysis.priority_score !== null ? (() => {
                        const { label, color } = getPriorityLabel(agentAnalysis.priority_score!);
                        return (
                          <div className="mt-3 flex items-end gap-3">
                            <span className="text-3xl font-bold">{agentAnalysis.priority_score}</span>
                            <span className="text-sm text-white/30">/10</span>
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${color}`}>{label}</span>
                          </div>
                        );
                      })() : <p className="mt-3 text-white/30 text-sm">—</p>}
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                      <p className="text-xs uppercase tracking-wider text-white/30">AI Confidence</p>
                      {agentAnalysis.confidence !== null ? (
                        <>
                          <div className="mt-3 flex items-end gap-2">
                            <span className="text-3xl font-bold">{Math.round((agentAnalysis.confidence ?? 0) * 100)}</span>
                            <span className="text-sm text-white/30">%</span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-violet-400 transition-all"
                              style={{ width: `${Math.round((agentAnalysis.confidence ?? 0) * 100)}%` }}
                            />
                          </div>
                        </>
                      ) : <p className="mt-3 text-white/30 text-sm">—</p>}
                    </div>
                  </div>

                  {/* Root Cause, Action, Impact */}
                  {["root_cause", "recommended_action", "impact_estimate"].map((field) => {
                    const labels: Record<string, string> = {
                      root_cause: "Probable Root Cause",
                      recommended_action: "Recommended Action",
                      impact_estimate: "Impact Estimate",
                    };
                    const val = agentAnalysis[field as keyof AgentAnalysis] as string | null;
                    return val ? (
                      <div key={field} className="rounded-xl border border-white/10 bg-black/20 p-5">
                        <p className="text-xs uppercase tracking-wider text-white/30">{labels[field]}</p>
                        <p className="mt-3 text-sm leading-relaxed text-white/80">{val}</p>
                      </div>
                    ) : null;
                  })}

                  {/* Agent Knowledge Used */}
                  {agentSources.length > 0 && (
                    <div className="rounded-xl border border-violet-400/20 bg-violet-400/5 p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <BookOpen size={15} className="text-violet-400" />
                        <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Knowledge Used</p>
                        <span className="text-[11px] text-white/30 ml-auto">Agent-retrieved from knowledge base</span>
                      </div>
                      <div className="space-y-3">
                        {agentSources.map((src, idx) => {
                          const isCampus = src.source === "campus-survey.md";
                          const relevancePct = src.score !== undefined ? Math.round(src.score * 100) : null;
                          const excerpt = src.content
                            ? src.content.replace(/^#+\s.*?\n/, "").trim().slice(0, 260)
                            : null;
                          return (
                            <div
                              key={idx}
                              className={`rounded-lg border p-3.5 text-xs ${
                                isCampus ? "border-amber-400/25 bg-amber-400/5" : "border-white/10 bg-black/40"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 font-medium">
                                  <span className="text-white/40 tabular-nums shrink-0">{idx + 1}.</span>
                                  <FileText size={12} className={isCampus ? "text-amber-400" : "text-violet-300"} />
                                  <span className={isCampus ? "text-amber-300" : "text-violet-300"}>{src.source}</span>
                                  {isCampus && (
                                    <span className="ml-1 rounded-full bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300 shrink-0">
                                      📋 Campus Survey Evidence
                                    </span>
                                  )}
                                </div>
                                {relevancePct !== null && (
                                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0 ${
                                    isCampus ? "bg-amber-400/10 text-amber-400" : "bg-violet-400/10 text-violet-400"
                                  }`}>
                                    Relevance: {relevancePct}%
                                  </span>
                                )}
                              </div>
                              {src.title && (
                                <p className="mt-1.5 text-[11px] text-white/40">
                                  <span className="text-white/25">Section: </span>
                                  <span className="text-white/55">{src.title}</span>
                                </p>
                              )}
                              {excerpt && (
                                <div className="mt-2">
                                  <p className="text-[10px] uppercase tracking-wider text-white/25 mb-1">Evidence:</p>
                                  <p className="text-white/55 leading-relaxed font-mono text-[11px] bg-white/[0.02] p-2 rounded border border-white/5 whitespace-pre-wrap line-clamp-4">
                                    {excerpt}{src.content && src.content.length > 260 && <span className="text-white/25"> …</span>}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Agent model info */}
                  {agentAnalysis.model_name && (
                    <div className="text-xs text-white/30 space-y-1">
                      <p>Agent powered by: <span className="text-white/50">{agentAnalysis.model_name}</span> · {formatDate(agentAnalysis.created_at)}</p>
                      {(agentAnalysis.model_name.includes("Fallback") || agentAnalysis.model_name.includes("Deterministic")) && (
                        <p className="text-amber-400/70 text-[11px]">Running with deterministic fallback — configure GEMINI_API_KEY for live agentic AI.</p>
                      )}
                    </div>
                  )}

                  {/* Responsible AI note */}
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-xs leading-5 text-white/35">
                    The agent selected tools based on report context, gathered evidence from the knowledge base,
                    and generated a grounded analysis.{" "}
                    <strong className="text-white/50">The agent cannot change report status — all operational decisions require human approval.</strong>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ─ Action Tracker ─ */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
          <h2 className="mb-4 font-semibold flex items-center gap-2">
            <Zap size={18} className="text-emerald-400" />
            Action Lifecycle
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { phase: "Issue Reported", done: true },
              { phase: "AI Analysis", done: !!analysis },
              {
                phase: "Human Review",
                done: ["action_planned", "in_progress", "resolved", "verified"].includes(
                  report.status
                ),
              },
              {
                phase: "Action Planned",
                done: ["in_progress", "resolved", "verified"].includes(report.status),
              },
              {
                phase: "In Progress",
                done: ["resolved", "verified"].includes(report.status),
              },
              { phase: "Resolved & Verified", done: report.status === "verified" },
            ].map((item) => (
              <div
                key={item.phase}
                className={`flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm ${
                  item.done
                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
                    : "border-white/5 bg-white/[0.02] text-white/30"
                }`}
              >
                <CheckCircle2
                  size={15}
                  className={item.done ? "text-emerald-400" : "text-white/15"}
                />
                {item.phase}
              </div>
            ))}
          </div>
        </div>

        {/* ─ Status History Log ─ */}
        {history.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <h2 className="mb-4 font-semibold flex items-center gap-2">
              <History size={18} className="text-white/40" />
              Status History
            </h2>
            <div className="space-y-3">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 text-sm text-white/60"
                >
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400/50 mt-1.5" />
                  <div>
                    <span className="font-medium text-white/80">
                      {entry.old_status
                        ? `${STATUS_LABELS[entry.old_status as StatusKey] || entry.old_status} → `
                        : ""}
                      {STATUS_LABELS[entry.new_status as StatusKey] || entry.new_status}
                    </span>
                    <span className="ml-2 text-xs text-white/30">
                      {formatDate(entry.changed_at)}
                    </span>
                    {entry.note && (
                      <p className="mt-0.5 text-xs text-white/35">{entry.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─ Responsible AI ─ */}
        <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.02] p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10">
              <ShieldCheck size={18} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="font-semibold">Responsible AI</h2>
              <p className="text-xs text-white/35">Built-in ethical AI safeguards</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                title: "Human Oversight",
                text: "AI analysis assists — it does not replace — human decision-making. All status changes require human action.",
              },
              {
                title: "Confidence Transparency",
                text: "AI confidence is displayed with every analysis. If confidence is below 70%, human review is explicitly recommended.",
              },
              {
                title: "Evidence-based Analysis",
                text: "AI analyzes user-provided descriptions and categories. It does not fabricate evidence or claim certainty it does not have.",
              },
              {
                title: "Privacy Protection",
                text: "No personal data is required. Reports focus on sustainability problems and locations, not individuals.",
              },
              {
                title: "Bias Awareness",
                text: "AI outputs may reflect biases in training data. Human judgment and local context should always be applied.",
              },
              {
                title: "Honest Labelling",
                text: "AI outputs are clearly labelled as AI-assisted analysis. Photo evidence remains separate from AI interpretation.",
              },
              {
                title: "Qualitative Impact Only",
                text: "Impact estimates are qualitative. Precise environmental savings are not claimed without supporting measurement data.",
              },
              {
                title: "Human Verification Required",
                text: "A report cannot be marked Resolved or Verified by AI alone. Human confirmation is always required.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
              >
                <p className="text-xs font-semibold text-emerald-400">{item.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-white/40">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* Footer */}
      <footer className="mt-10 border-t border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-white/30">
          <span>AI Sustainability Discovery Platform</span>
          <span>Responsible AI · SDG 11 · Human Oversight</span>
        </div>
      </footer>
    </main>
  );
}

function PageHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
        >
          <ArrowLeft size={18} />
          Back to Reports
        </button>
        <div className="font-semibold">AI Sustainability Discovery</div>
      </div>
    </header>
  );
}