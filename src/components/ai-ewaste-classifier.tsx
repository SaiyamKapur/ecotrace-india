"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Sparkles,
  Trash2,
  RefreshCw,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Scale,
  ArrowRight,
  Cpu,
  Image as ImageIcon,
} from "lucide-react";
import { EWASTE_CATEGORIES, getEstimatedUnitWeight } from "@/lib/constants";
import { useApp } from "@/components/providers";

export interface EditableDetectedItem {
  id: string;
  category: string;
  quantity: number;
  aiPredictedCategory?: string;
  detectedCount?: number | null;
  confidence?: number | null;
  userCorrected: boolean;
  notes?: string;
}

export interface ClassificationHandoff {
  items: EditableDetectedItem[];
  imageDataUrl: string | null;
  mode: "live_vision_api" | "demo_mode" | "manual";
  summary: string;
}

interface ApiClassifyResponse {
  mode: "live_vision_api" | "demo_mode";
  provider: string;
  countReliable: boolean;
  multiDeviceDetected: boolean;
  summary: string;
  totalEstimatedWeightKg: number;
  weightDisclaimer: string;
  items: Array<{
    category: string;
    detectedCount: number | null;
    suggestedQuantity: number;
    confidence: number | null;
    estimatedUnitWeightKg: number;
    estimatedTotalWeightKg: number;
    hazardLevel: string;
    recyclableMaterials: string;
    notes: string;
  }>;
}

export function AiEwasteClassifier({
  onApplyToPickup,
  compact = false,
}: {
  onApplyToPickup?: (payload: ClassificationHandoff) => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const { user, toast } = useApp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMeta, setResultMeta] = useState<Omit<ApiClassifyResponse, "items"> | null>(
    null
  );
  const [items, setItems] = useState<EditableDetectedItem[]>([]);

  const handleFilePicked = (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image size must be 8 MB or smaller.");
      return;
    }
    setSelectedFile(file);
    setFileName(file.name);
    setResultMeta(null);
    setItems([]);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLoadSampleImage = async (url: string, name: string, label: string) => {
    setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Photo unavailable");
      const blob = await res.blob();
      handleFilePicked(new File([blob], name, { type: blob.type || "image/jpeg" }));
      toast({ title: `${label} photo loaded`, description: "Click Identify E-Waste to inspect the visible devices.", variant: "info" });
    } catch {
      setError("Unable to load the sample image. You can upload your own JPG, PNG or WEBP instead.");
    }
  };

  const handleClear = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    setFileName("");
    setResultMeta(null);
    setItems([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleIdentify = async () => {
    if (!selectedFile && !previewUrl) {
      setError("Please upload an e-waste image first.");
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      let res: Response;
      if (selectedFile) {
        const fd = new FormData();
        fd.append("image", selectedFile);
        res = await fetch("/api/ai/classify", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/ai/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: previewUrl, fileName }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Classification failed.");
      }

      const typed = data as ApiClassifyResponse;
      setResultMeta({
        mode: typed.mode,
        provider: typed.provider,
        countReliable: typed.countReliable,
        multiDeviceDetected: typed.multiDeviceDetected,
        summary: typed.summary,
        totalEstimatedWeightKg: typed.totalEstimatedWeightKg,
        weightDisclaimer: typed.weightDisclaimer,
      });

      setItems(
        typed.items.map((it, idx) => ({
          id: `det-${Date.now()}-${idx}`,
          category: it.category,
          quantity: it.suggestedQuantity,
          aiPredictedCategory: it.category,
          detectedCount: it.detectedCount,
          confidence: it.confidence,
          userCorrected: false,
          notes: it.notes,
        }))
      );

      toast({
        title:
          typed.mode === "live_vision_api"
            ? "Vision AI Classification Ready"
            : "Demo Mode Analysis Complete",
        description:
          typed.mode === "live_vision_api"
            ? "Review detected items and adjust if needed."
            : "Verify categories & enter exact quantities before scheduling.",
        variant: typed.mode === "live_vision_api" ? "success" : "warning",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Classification error.");
    } finally {
      setAnalyzing(false);
    }
  };

  const updateItemCategory = (id: string, newCat: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              category: newCat,
              userCorrected: it.aiPredictedCategory
                ? newCat !== it.aiPredictedCategory
                : true,
            }
          : it
      )
    );
  };

  const updateItemQty = (id: string, nextQty: number) => {
    const safe = Math.max(1, Math.min(200, Math.round(nextQty || 1)));
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, quantity: safe } : it))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const addManualItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        category: "Mobile Phones",
        quantity: 1,
        userCorrected: true,
        notes: "Added manually by user.",
      },
    ]);
  };

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const totalEstimatedKg = Number(
    items
      .reduce((s, i) => s + getEstimatedUnitWeight(i.category) * i.quantity, 0)
      .toFixed(2)
  );

  const handleSendToPickup = () => {
    if (items.length === 0) {
      toast({
        title: "Add at least one item",
        description: "Identify an image or add an item manually first.",
        variant: "warning",
      });
      return;
    }

    const payload: ClassificationHandoff = {
      items,
      imageDataUrl: previewUrl && previewUrl.length < 1_200_000 ? previewUrl : null,
      mode: resultMeta?.mode ?? "manual",
      summary: resultMeta?.summary ?? "User confirmed e-waste items.",
    };

    if (onApplyToPickup) {
      onApplyToPickup(payload);
      toast({
        title: "Items Added to Pickup Form",
        description: `${totalQty} item(s) (~${totalEstimatedKg} kg est.) loaded into your pickup request.`,
        variant: "success",
      });
      return;
    }

    try {
      window.sessionStorage.setItem(
        "ecotrace_pending_ai_items",
        JSON.stringify(payload)
      );
    } catch {
      // Ignore storage quota if image is large
      window.sessionStorage.setItem(
        "ecotrace_pending_ai_items",
        JSON.stringify({ ...payload, imageDataUrl: null })
      );
    }

    if (user) {
      router.push("/dashboard/citizen?tab=schedule&fromAi=1");
    } else {
      router.push("/login?redirect=/dashboard/citizen?tab=schedule&fromAi=1");
    }
  };

  return (
    <div
      className={`rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] shadow-xl shadow-emerald-950/5 ${
        compact ? "p-5" : "p-6 sm:p-8"
      }`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Image Upload & Preview */}
        <div className="lg:col-span-5 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFilePicked(file);
            }}
          />

          {!previewUrl ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleFilePicked(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="group cursor-pointer rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 p-8 text-center transition-all"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 group-hover:scale-105 transition-transform">
                <Upload className="w-7 h-7" />
              </div>
              <p className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
                Upload E-Waste Photo (Single or Multiple Devices)
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Drag & drop or click to choose JPG, PNG, or WEBP (max 8 MB)
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {["Phones", "Laptops", "Monitors", "Batteries", "PCBs", "Cables"].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full text-[11px] bg-white dark:bg-[#0d1f19] border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                    >
                      {tag}
                    </span>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-emerald-200 dark:border-emerald-800 bg-slate-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Uploaded e-waste preview"
                className="w-full h-64 object-cover"
              />
              {analyzing && (
                <div className="absolute inset-0 bg-emerald-950/75 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-3">
                  <div className="h-10 w-10 rounded-full border-4 border-emerald-400/30 border-t-emerald-300 animate-spin" />
                  <p className="text-sm font-semibold">Analyzing electronic devices...</p>
                </div>
              )}
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-between gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-black/70 text-white text-xs truncate max-w-[60%]">
                  {fileName || "e-waste-photo"}
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/90 text-slate-900 text-xs font-semibold hover:bg-white"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleIdentify}
              disabled={!previewUrl || analyzing}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-600 hover:from-emerald-700 hover:to-emerald-500 disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-emerald-700/20 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              {analyzing ? "Identifying..." : "Identify E-Waste"}
            </button>

            <button type="button" onClick={() => void handleLoadSampleImage("/images/sample-multidevice.jpg", "sample-multidevice.jpg", "Multi-device")} className="inline-flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"><ImageIcon className="w-4 h-4" />Try Multi-Device Sample</button>
            <button type="button" onClick={() => void handleLoadSampleImage("/images/tablet-sample.jpg", "tablet-sample.jpg", "Tablet")} className="inline-flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 text-xs font-semibold hover:bg-sky-100 transition-colors"><ImageIcon className="w-4 h-4" />Try Tablet Photo</button>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Tablet example photo: Karolina Grabowska / Pexels. You can upload your own device image at any time.</p>

          {error && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right: Structured Multi-Device Results & Manual Correction */}
        <div className="lg:col-span-7 space-y-4">
          {resultMeta ? (
            <div
              className={`rounded-2xl p-4 border ${
                resultMeta.mode === "live_vision_api"
                  ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                  : "bg-amber-50/80 dark:bg-amber-950/30 border-amber-300/80 dark:border-amber-800/70"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                    resultMeta.mode === "live_vision_api"
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-500 text-white"
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  {resultMeta.mode === "live_vision_api"
                    ? `Live Vision AI • ${resultMeta.provider}`
                    : "Demo Mode · Live vision unavailable"}
                </span>
                {resultMeta.multiDeviceDetected && (
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    Multi-Device Breakdown Enabled
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {resultMeta.summary}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-emerald-900/70 bg-slate-50/80 dark:bg-emerald-950/20 p-5">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Multi-Device AI Classification & Manual Verification
              </h4>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Upload a photo with one or several devices (e.g., 2 smartphones + 1 laptop +
                chargers). You can always correct predicted categories, enter exact physical
                counts, or add additional categories manually before submitting your pickup.
              </p>
            </div>
          )}

          {/* Detected / Editable Items List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Identified & Confirmed E-Waste Items ({items.length})
              </h4>
              <button
                type="button"
                onClick={addManualItem}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Device Row
              </button>
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-emerald-800/70 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No devices added yet. Upload a photo and click <strong>Identify E-Waste</strong>,
                try the sample photo, or click <strong>Add Device Row</strong>.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {items.map((item) => {
                  const unitKg = getEstimatedUnitWeight(item.category);
                  const lineKg = Number((unitKg * item.quantity).toFixed(2));
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-emerald-900/10 dark:border-emerald-500/15 bg-emerald-50/35 dark:bg-[#091913] p-3.5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
                    >
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={item.category}
                            onChange={(e) => updateItemCategory(item.id, e.target.value)}
                            aria-label="E-waste category"
                            className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#0d1f19] px-3 py-1.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            {EWASTE_CATEGORIES.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label}
                              </option>
                            ))}
                          </select>

                          {item.confidence != null && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold">
                              <CheckCircle2 className="w-3 h-3" />
                              {Math.round(item.confidence * 100)}% model confidence
                            </span>
                          )}

                          {item.userCorrected && (
                            <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300 text-[11px] font-semibold">
                              User Verified / Corrected
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          {item.detectedCount != null
                            ? `Vision model estimated ${item.detectedCount} visible unit(s) — please verify. `
                            : "Please confirm exact quantity manually. "}
                          Est. reference weight: <strong>~{lineKg} kg</strong> ({unitKg} kg/unit avg)
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="inline-flex items-center rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#0d1f19]">
                          <button
                            type="button"
                            onClick={() => updateItemQty(item.id, item.quantity - 1)}
                            className="p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-700"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={200}
                            value={item.quantity}
                            onChange={(e) => updateItemQty(item.id, Number(e.target.value))}
                            className="w-11 text-center text-sm font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none tabular-nums"
                          />
                          <button
                            type="button"
                            onClick={() => updateItemQty(item.id, item.quantity + 1)}
                            className="p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-700"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          aria-label="Remove device row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Estimated Weight Transparency Strip + CTA */}
          <div className="rounded-2xl bg-slate-900 dark:bg-emerald-950/80 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold">
                <Scale className="w-4 h-4" />
                <span>Estimated Weight (Separate from Actual Physical Weight)</span>
              </div>
              <p className="text-lg font-extrabold tabular-nums">
                {totalQty} Device(s) • ~{totalEstimatedKg.toFixed(2)} kg{" "}
                <span className="text-xs font-normal text-emerald-200/80">(estimate only)</span>
              </p>
              <p className="text-[11px] text-slate-300 dark:text-emerald-200/75">
                Image analysis cannot measure physical mass. Actual collected weight is recorded on
                a scale at pickup.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSendToPickup}
              disabled={items.length === 0}
              className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-sm transition-colors"
            >
              <span>Add to Pickup Request</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
