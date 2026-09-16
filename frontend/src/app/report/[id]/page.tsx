"use client";

import { use, useEffect, useState } from "react";
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
};

type ReportDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function ReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const router = useRouter();

  // Next.js 16: params is a Promise
  const { id } = use(params);

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReport() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/reports/${id}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const message =
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail);

        throw new Error(
          message || "Failed to load report."
        );
      }

      setReport(data);
    } catch (err) {
      console.error("Failed to load report:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load report."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, [id]);

  function formatDate(dateString: string) {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  }

  const [imageError, setImageError] = useState(false);

  function getPhotoUrl(photoPath: string | null) {
    if (!photoPath) {
      return null;
    }

    const cleanPath = photoPath.replace(/\\/g, "/").replace(/^\/+/, "");
    const cleanApiUrl = API_URL.replace(/\/+$/, "");
    return `${cleanApiUrl}/${cleanPath}`;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <header className="border-b border-white/10">
          <div className="mx-auto max-w-6xl px-6 py-5">
            <button
              onClick={() => router.push("/report")}
              className="flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
            >
              <ArrowLeft size={18} />
              Back to Reports
            </button>
          </div>
        </header>

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

  if (error || !report) {
    return (
      <main className="min-h-screen bg-black text-white">
        <header className="border-b border-white/10">
          <div className="mx-auto max-w-6xl px-6 py-5">
            <button
              onClick={() => router.push("/report")}
              className="flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
            >
              <ArrowLeft size={18} />
              Back to Reports
            </button>
          </div>
        </header>

        <section className="mx-auto flex min-h-[65vh] max-w-2xl items-center justify-center px-6">
          <div className="w-full rounded-2xl border border-red-400/20 bg-red-400/5 p-8 text-center">
            <AlertCircle
              size={36}
              className="mx-auto text-red-400"
            />

            <h1 className="mt-5 text-2xl font-bold">
              Unable to load report
            </h1>

            <p className="mt-3 text-sm text-red-300/60">
              {error || "Report not found."}
            </p>

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

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <button
            onClick={() => router.push("/report")}
            className="flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
          >
            <ArrowLeft size={18} />
            Back to Reports
          </button>

          <div className="font-semibold">
            AI Sustainability Discovery
          </div>
        </div>
      </header>

      {/* Main */}
      <section className="mx-auto max-w-4xl px-6 py-14">
        {/* Title */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-xs font-medium text-emerald-400">
              {report.category}
            </span>

            <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/40">
              Report #{report.id}
            </span>

            <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs capitalize text-white/50">
              {report.status}
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
              {formatDate(report.created_at)}
            </span>
          </div>
        </div>

        {/* Evidence */}
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
          <div className="flex items-center gap-2">
            <ImageIcon
              size={18}
              className="text-emerald-400"
            />

            <h2 className="font-semibold">
              Evidence
            </h2>
          </div>

          {photoUrl && !imageError ? (
            <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-black/60">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs text-white/50">
                <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                  <CheckCircle2 size={14} />
                  Verified Photo Evidence
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
                  className="max-h-[550px] w-full rounded-lg object-contain"
                  onError={() => setImageError(true)}
                />
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
              <ImageIcon
                size={30}
                className="mx-auto text-white/20"
              />

              <p className="mt-3 text-sm text-white/40">
                {imageError
                  ? "Unable to load evidence image."
                  : "No photo evidence was attached to this report."}
              </p>
            </div>
          )}
        </div>

        {/* Report Information */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
          <h2 className="font-semibold">
            Report Information
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/30">
                Category
              </p>

              <p className="mt-2 text-sm font-medium">
                {report.category}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-white/30">
                Location
              </p>

              <p className="mt-2 text-sm font-medium">
                {report.location || "Not specified"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-white/30">
                Status
              </p>

              <p className="mt-2 flex items-center gap-2 text-sm font-medium capitalize">
                <CheckCircle2
                  size={15}
                  className="text-emerald-400"
                />
                {report.status}
              </p>
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        <div className="mt-6 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.025] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10">
              <Brain
                size={20}
                className="text-emerald-400"
              />
            </div>

            <div>
              <h2 className="font-semibold">
                AI Analysis
              </h2>

              <p className="text-xs text-white/35">
                Sustainability intelligence
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-wider text-white/30">
                Priority Score
              </p>

              <p className="mt-3 text-lg font-semibold text-white/40">
                Awaiting analysis
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-wider text-white/30">
                Root Cause
              </p>

              <p className="mt-3 text-lg font-semibold text-white/40">
                Awaiting analysis
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-wider text-white/30">
                Recommended Action
              </p>

              <p className="mt-3 text-lg font-semibold text-white/40">
                Awaiting analysis
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4 text-xs leading-5 text-white/35">
            AI analysis will classify the problem, identify
            possible patterns and root causes, estimate
            priority, and suggest evidence-based actions.
            Final operational decisions should remain
            human-approved.
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-20 border-t border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-white/30">
          <span>
            AI Sustainability Discovery Platform
          </span>

          <span>
            Responsible AI • Sustainability • Data-driven Impact
          </span>
        </div>
      </footer>
    </main>
  );
}