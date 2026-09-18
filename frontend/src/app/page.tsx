"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  Leaf,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Zap,
  Globe,
  Users,
  TrendingUp,
  FileText,
  Activity,
} from "lucide-react";

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

export default function Home() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/reports/stats`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500">
              <Leaf className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-none">
                AI Sustainability Discovery
              </h1>
              <p className="mt-0.5 text-xs text-slate-400">
                SDG 11 — Sustainable Cities
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-3">
            <button
              onClick={() => router.push("/report")}
              className="hidden rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:text-white sm:block"
            >
              Reports
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="hidden rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:text-white sm:block"
            >
              Impact Dashboard
            </button>
            <button
              onClick={() => router.push("/report/new")}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              <AlertTriangle className="h-4 w-4" />
              Report Issue
            </button>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-7xl px-6 pb-8 pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300">
            <Globe className="h-4 w-4" />
            1M1B AI for Sustainability · IBM SkillsBuild · AICTE
          </div>

          <h2 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Turn observations into{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              sustainable action
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
            Report real-world sustainability problems. AI analyzes root causes,
            prioritizes by impact, and tracks every issue from report to
            resolution — supporting{" "}
            <span className="text-emerald-400">SDG 11: Sustainable Cities.</span>
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => router.push("/report/new")}
              className="flex items-center gap-2.5 rounded-xl bg-emerald-500 px-7 py-4 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 hover:shadow-emerald-400/30"
            >
              <AlertTriangle className="h-5 w-5" />
              Report a Sustainability Issue
            </button>
            <button
              onClick={() => router.push("/report")}
              className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-7 py-4 text-base font-semibold text-white transition hover:bg-white/10"
            >
              <FileText className="h-5 w-5" />
              View Reports
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-7 py-4 text-base font-semibold text-white transition hover:bg-white/10"
            >
              <BarChart3 className="h-5 w-5" />
              Impact Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* ── Live Stats ── */}
      <section className="mx-auto max-w-7xl px-6 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<FileText className="h-5 w-5" />}
            label="Total Reports"
            value={stats ? String(stats.total) : "—"}
            color="emerald"
          />
          <StatCard
            icon={<Activity className="h-5 w-5" />}
            label="In Progress"
            value={
              stats
                ? String(
                    (stats.under_review || 0) +
                      (stats.action_planned || 0) +
                      (stats.in_progress || 0)
                  )
                : "—"
            }
            color="blue"
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Resolved"
            value={
              stats
                ? String((stats.resolved || 0) + (stats.verified || 0))
                : "—"
            }
            color="teal"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="With Photo Evidence"
            value={stats ? String(stats.with_photo) : "—"}
            color="purple"
          />
        </div>
      </section>

      {/* ── Workflow ── */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="mb-8 text-center">
          <h3 className="text-2xl font-bold">How it works</h3>
          <p className="mt-2 text-slate-400">
            From problem discovery to measurable impact
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          {[
            {
              step: "01",
              icon: <AlertTriangle className="h-6 w-6" />,
              title: "Discover",
              desc: "Report a real-world sustainability issue with description, location, and photo evidence.",
              color: "emerald",
            },
            {
              step: "02",
              icon: <Brain className="h-6 w-6" />,
              title: "Understand",
              desc: "AI analyzes the report — classifying category, identifying probable root cause, and assessing confidence.",
              color: "blue",
            },
            {
              step: "03",
              icon: <Zap className="h-6 w-6" />,
              title: "Prioritize",
              desc: "AI assigns a priority score (1–10) based on impact and urgency. Human review confirms the assessment.",
              color: "amber",
            },
            {
              step: "04",
              icon: <Users className="h-6 w-6" />,
              title: "Act",
              desc: "Track the report through lifecycle stages: Under Review → Action Planned → In Progress → Resolved.",
              color: "teal",
            },
            {
              step: "05",
              icon: <BarChart3 className="h-6 w-6" />,
              title: "Measure",
              desc: "View aggregate impact metrics on the dashboard — real data, no fabricated numbers.",
              color: "purple",
            },
          ].map((item, i) => (
            <div key={i} className="relative">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 h-full">
                <div
                  className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${
                    item.color === "emerald"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : item.color === "blue"
                      ? "bg-blue-500/10 text-blue-400"
                      : item.color === "amber"
                      ? "bg-amber-500/10 text-amber-400"
                      : item.color === "teal"
                      ? "bg-teal-500/10 text-teal-400"
                      : "bg-purple-500/10 text-purple-400"
                  }`}
                >
                  {item.icon}
                </div>
                <p className="mb-1 text-xs font-semibold text-slate-500">
                  {item.step}
                </p>
                <h4 className="text-base font-semibold">{item.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {item.desc}
                </p>
              </div>
              {i < 4 && (
                <div className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 md:block">
                  <ArrowRight className="h-4 w-4 text-slate-600" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── AI Features ── */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="rounded-3xl border border-emerald-400/10 bg-emerald-400/[0.03] p-8 md:p-12">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300">
                <Brain className="h-3.5 w-3.5" />
                AI Analysis Engine
              </div>
              <h3 className="text-3xl font-bold">
                AI-assisted sustainability intelligence
              </h3>
              <p className="mt-4 text-slate-400">
                Every submitted report is analyzed by an AI service to provide
                structured, actionable insights — designed to assist human
                decision-making, not replace it.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Category classification",
                  "Probable root cause identification",
                  "AI-assisted priority score (1–10)",
                  "Confidence level with human review recommendation",
                  "Actionable recommended response",
                  "Qualitative impact estimation",
                ].map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-wider text-white/30">
                  AI Priority Score
                </p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-emerald-400">8</span>
                  <span className="text-slate-500">/10</span>
                  <span className="ml-2 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                    HIGH
                  </span>
                </div>
                <p className="mt-2 text-xs text-white/40">
                  AI-Assisted Priority Assessment
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-wider text-white/30">
                  AI Confidence
                </p>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">82%</span>
                    <span className="text-slate-500">Human review recommended for low confidence</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: "82%" }}
                    />
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-wider text-white/30">
                  Probable Root Cause
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  &quot;Insufficient waste collection frequency may be contributing to waste accumulation and overflow.&quot;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SDG Alignment ── */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-blue-400/20 bg-blue-400/[0.04] p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <Globe className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
              Primary SDG
            </p>
            <h4 className="mt-2 text-lg font-bold">SDG 11</h4>
            <p className="mt-1 text-sm text-slate-400">
              Sustainable Cities and Communities — making cities inclusive,
              safe, resilient, and sustainable.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10">
              <Users className="h-5 w-5 text-teal-400" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">
              Target Users
            </p>
            <h4 className="mt-2 text-lg font-bold">Students & Communities</h4>
            <p className="mt-1 text-sm text-slate-400">
              Campus communities, local residents, and sustainability officers
              who observe and manage environmental issues.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
              <TrendingUp className="h-5 w-5 text-purple-400" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-400">
              Expected Impact
            </p>
            <h4 className="mt-2 text-lg font-bold">Data-driven Action</h4>
            <p className="mt-1 text-sm text-slate-400">
              Converting ad-hoc observations into a structured, tracked, and
              AI-assisted problem resolution pipeline.
            </p>
          </div>
        </div>
      </section>

      {/* ── Responsible AI ── */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold">Responsible AI Principles</h3>
              <p className="text-xs text-slate-500">
                Built-in ethical AI safeguards
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Human Oversight",
                desc: "AI assists, humans decide. All AI outputs require human review before action.",
              },
              {
                title: "Confidence Transparency",
                desc: "Every analysis shows confidence level. Low confidence triggers a human review recommendation.",
              },
              {
                title: "Evidence-based",
                desc: "Analysis is grounded in user-submitted observations. AI does not fabricate evidence.",
              },
              {
                title: "Privacy Protection",
                desc: "No personal information collected. Reports focus on places and problems, not individuals.",
              },
              {
                title: "Bias Awareness",
                desc: "AI outputs may reflect training biases. Human review and contextual judgment are essential.",
              },
              {
                title: "Honest Labelling",
                desc: "AI outputs are clearly labelled as AI-assisted analysis, not verified ground truth.",
              },
              {
                title: "No False Claims",
                desc: "Impact estimates are clearly labelled qualitative. No fabricated numerical environmental savings.",
              },
              {
                title: "Human Verification",
                desc: "Reports are not marked resolved or verified based solely on AI — human confirmation required.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
              >
                <p className="text-xs font-semibold text-emerald-400">
                  {item.title}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 p-10 text-center">
          <h3 className="text-3xl font-bold">
            Start making an impact today
          </h3>
          <p className="mx-auto mt-3 max-w-lg text-slate-400">
            Every report is a step toward a more sustainable, liveable community.
          </p>
          <button
            onClick={() => router.push("/report/new")}
            className="mt-7 inline-flex items-center gap-2.5 rounded-xl bg-emerald-500 px-8 py-4 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
          >
            <AlertTriangle className="h-5 w-5" />
            Report a Sustainability Issue
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-slate-500 md:flex-row">
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-emerald-500" />
              <span>AI Sustainability Discovery Platform</span>
            </div>
            <span>
              1M1B AI for Sustainability · IBM SkillsBuild · AICTE · SDG 11
            </span>
            <span>Responsible AI · Human Oversight · Evidence-based</span>
          </div>
        </div>
      </footer>
      {/* ── Floating Sticky Report Button ── */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => router.push("/report/new")}
          className="flex items-center gap-2.5 rounded-full bg-emerald-500 px-5 py-3.5 text-sm font-bold text-slate-950 shadow-2xl shadow-emerald-500/50 transition-all hover:scale-105 hover:bg-emerald-400 active:scale-95"
        >
          <AlertTriangle className="h-5 w-5" />
          <span>Report Issue</span>
        </button>
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "emerald" | "blue" | "teal" | "purple";
}) {
  const colors = {
    emerald: "bg-emerald-500/10 text-emerald-400",
    blue: "bg-blue-500/10 text-blue-400",
    teal: "bg-teal-500/10 text-teal-400",
    purple: "bg-purple-500/10 text-purple-400",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div
        className={`mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg ${colors[color]}`}
      >
        {icon}
      </div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{label}</p>
    </div>
  );
}