"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Image as ImageIcon,
  RefreshCw,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const categories = [
  "Waste",
  "Water",
  "Energy",
  "Food",
  "Transport",
  "Air Quality",
  "Other",
];

export default function NewReportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Waste");
  const [location, setLocation] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successId, setSuccessId] = useState<number | null>(null);

  // Cleanup preview object URL when component unmounts or previewUrl changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handlePhotoSelect(selectedFile: File | null) {
    setError("");

    if (!selectedFile) {
      return;
    }

    const fileType = selectedFile.type.toLowerCase();
    const fileName = selectedFile.name.toLowerCase();

    const isJpgOrPng =
      fileType === "image/jpeg" ||
      fileType === "image/png" ||
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg") ||
      fileName.endsWith(".png");

    if (!isJpgOrPng) {
      setError("Only JPG and PNG images are allowed.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      const sizeMb = (selectedFile.size / (1024 * 1024)).toFixed(2);
      setError(`Image must be smaller than 5 MB. Selected file is ${sizeMb} MB.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPhoto(selectedFile);
    setPreviewUrl(objectUrl);
  }

  function handleRemovePhoto() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPhoto(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!description.trim()) {
      setError("Please describe the sustainability problem.");
      return;
    }

    if (photo && photo.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("description", description.trim());
      formData.append("category", category);

      if (location.trim()) {
        formData.append("location", location.trim());
      }

      if (photo) {
        formData.append("photo", photo);
      }

      const response = await fetch(`${API_URL}/api/reports`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const message =
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail);

        throw new Error(message || "Failed to submit report.");
      }

      setSuccessId(data.id);
    } catch (err) {
      console.error("Report submission failed:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit report."
      );
    } finally {
      setLoading(false);
    }
  }

  if (successId !== null) {
    return (
      <main className="min-h-screen bg-black text-white">
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

        <section className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-6">
          <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2
                size={34}
                className="text-emerald-400"
              />
            </div>

            <h1 className="text-3xl font-bold">
              Report submitted
            </h1>

            <p className="mt-3 text-white/60">
              Your sustainability problem has been successfully
              recorded.
            </p>

            <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-wider text-white/40">
                Report ID
              </p>

              <p className="mt-1 text-2xl font-semibold text-emerald-400">
                #{successId}
              </p>
            </div>

            <div className="mt-8 flex justify-center gap-3">
              <button
                onClick={() => router.push("/report")}
                className="rounded-lg border border-white/15 px-5 py-3 text-sm font-medium transition hover:bg-white/10"
              >
                View Reports
              </button>

              <button
                onClick={() => {
                  setSuccessId(null);
                  setDescription("");
                  setCategory("Waste");
                  setLocation("");
                  handleRemovePhoto();
                  setError("");
                }}
                className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Submit Another
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
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

      <section className="mx-auto max-w-3xl px-6 py-14">
        <div className="mb-10">
          <div className="mb-4 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 text-xs text-emerald-400">
            Sustainability Report
          </div>

          <h1 className="text-4xl font-bold tracking-tight">
            Report a Problem
          </h1>

          <p className="mt-3 text-white/55">
            Help identify real sustainability problems by
            submitting an observation from your surroundings.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-7"
        >
          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              What did you observe?
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: Dustbin is overflowing near the college entrance..."
              rows={6}
              className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none transition placeholder:text-white/25 focus:border-emerald-400/50"
            />
          </div>

          {/* Category */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Category
            </label>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-emerald-400/50"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Location
            </label>

            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Example: Main College Entrance"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none transition placeholder:text-white/25 focus:border-emerald-400/50"
            />
          </div>

          {/* Photo Evidence Upload & Preview */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Photo Evidence{" "}
              <span className="text-white/30">
                (optional)
              </span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0] || null;
                handlePhotoSelect(selectedFile);
              }}
            />

            {!photo || !previewUrl ? (
              <label
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/20 px-6 py-10 text-center transition hover:border-emerald-400/40"
              >
                <Upload
                  size={28}
                  className="mb-3 text-white/40"
                />

                <span className="text-sm font-medium text-white/70">
                  Click to upload a JPG or PNG image
                </span>

                <span className="mt-1 text-xs text-white/30">
                  Maximum file size: 5 MB
                </span>
              </label>
            ) : (
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black">
                      <img
                        src={previewUrl}
                        alt="Selected photo preview"
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <ImageIcon size={16} className="text-emerald-400" />
                        <span className="truncate text-sm font-medium text-white">
                          {photo.name}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-3 text-xs text-white/40">
                        <span>{formatFileSize(photo.size)}</span>
                        <span>•</span>
                        <span className="uppercase">{photo.type.split("/")[1] || "IMAGE"}</span>
                        <span>•</span>
                        <span className="text-emerald-400">Ready to upload</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:self-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10"
                    >
                      <RefreshCw size={13} />
                      Change
                    </button>

                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/20"
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0"
              />

              <span className="break-words">
                {error}
              </span>
            </div>
          )}

          {/* Responsible AI notice */}
          <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/5 p-4 text-xs leading-5 text-white/50">
            Reports are analyzed to understand sustainability
            patterns. Avoid submitting personal or sensitive
            information.
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Submitting..."
              : "Submit Sustainability Report"}
          </button>
        </form>
      </section>
    </main>
  );
}