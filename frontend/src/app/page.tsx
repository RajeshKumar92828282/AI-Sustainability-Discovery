"use client";

import {
  BarChart3,
  Brain,
  Database,
  FileUp,
  Leaf,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">
              <Leaf className="h-6 w-6 text-slate-950" />
            </div>

            <div>
              <h1 className="text-lg font-semibold">
                AI Sustainability Discovery
              </h1>
              <p className="text-xs text-slate-400">
                Data-driven campus problem discovery
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300">
            <Sparkles className="h-4 w-4" />
            IBM BOB Powered
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pb-12 pt-16">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
            <Brain className="h-4 w-4 text-emerald-400" />
            AI + Sustainability
          </div>

          <h2 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Discover real sustainability problems from{" "}
            <span className="text-emerald-400">real campus data.</span>
          </h2>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Upload your Google Forms survey data and use responsible AI to
            identify patterns, understand root causes, and prioritize the most
            important sustainability challenges.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400">
              <Upload className="h-5 w-5" />
              Upload Survey Data
            </button>

            <button className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white transition hover:bg-white/10">
              <BarChart3 className="h-5 w-5" />
              View Analysis
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-7xl px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Database />}
            title="Total Responses"
            value="0"
            description="Survey responses"
          />

          <StatCard
            icon={<Target />}
            title="Problems Identified"
            value="0"
            description="AI-discovered problems"
          />

          <StatCard
            icon={<Lightbulb />}
            title="AI Insights"
            value="0"
            description="Generated insights"
          />

          <StatCard
            icon={<ShieldCheck />}
            title="Evidence Score"
            value="--"
            description="After analysis"
          />
        </div>
      </section>

      {/* Main Cards */}
      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-10 lg:grid-cols-3">
        {/* Upload */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-3">
              <FileUp className="h-6 w-6 text-emerald-400" />
            </div>

            <div>
              <h3 className="text-xl font-semibold">
                Upload Sustainability Data
              </h3>
              <p className="text-sm text-slate-400">
                Import responses collected through Google Forms.
              </p>
            </div>
          </div>

          <div className="mt-6 flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-slate-900/50">
            <Upload className="mb-4 h-10 w-10 text-slate-500" />

            <p className="font-medium">Drop your CSV or Excel file here</p>

            <p className="mt-2 text-sm text-slate-500">
              Supported formats: CSV, XLSX
            </p>

            <button className="mt-5 rounded-lg border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium hover:bg-white/10">
              Choose File
            </button>
          </div>
        </div>

        {/* AI Engine */}
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-3">
              <Brain className="h-6 w-6 text-emerald-400" />
            </div>

            <div>
              <h3 className="font-semibold">AI Analysis Engine</h3>
              <p className="text-sm text-slate-400">IBM BOB</p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <PipelineItem number="01" text="Classify observations" />
            <PipelineItem number="02" text="Detect patterns" />
            <PipelineItem number="03" text="Analyze root causes" />
            <PipelineItem number="04" text="Generate insights" />
            <PipelineItem number="05" text="Prioritize problems" />
          </div>

          <div className="mt-7 rounded-xl border border-white/10 bg-slate-950/50 p-4">
            <div className="flex items-center gap-2 text-sm text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Ready for dataset
            </div>
          </div>
        </div>
      </section>

      {/* Analysis Preview */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">Problem Discovery</h3>
              <p className="mt-1 text-sm text-slate-400">
                AI-generated sustainability findings will appear here.
              </p>
            </div>

            <BarChart3 className="h-6 w-6 text-slate-500" />
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <EmptyInsight
              title="Top Problem"
              text="Upload data to discover"
            />

            <EmptyInsight
              title="Common Location"
              text="Waiting for analysis"
            />

            <EmptyInsight
              title="Root Cause"
              text="Waiting for analysis"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-6">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 text-sm text-slate-500 sm:flex-row">
          <p>AI Sustainability Discovery Platform</p>
          <p>Responsible AI • Sustainability • Data-driven Impact</p>
        </div>
      </footer>
    </main>
  );
}

function StatCard({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-white/5 p-2 text-emerald-400">
          {icon}
        </div>

        <span className="text-3xl font-bold">{value}</span>
      </div>

      <h3 className="mt-5 font-medium">{title}</h3>

      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function PipelineItem({
  number,
  text,
}: {
  number: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-xs font-semibold text-emerald-400">
        {number}
      </span>

      <span className="text-sm text-slate-300">{text}</span>
    </div>
  );
}

function EmptyInsight({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/50 p-5">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-3 font-medium text-slate-300">{text}</p>
    </div>
  );
}