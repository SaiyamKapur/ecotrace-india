"use client";

import React, { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Leaf,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Users,
  Truck,
  Recycle,
  Building2,
  MapPin,
  Shield,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useApp } from "@/components/providers";
import type { UserRole } from "@/db/schema";

const ROLE_ICONS: Record<UserRole, React.ComponentType<{ className?: string }>> = {
  citizen: Users,
  partner: Truck,
  recycler: Recycle,
  organization: Building2,
  center_manager: MapPin,
  admin: Shield,
};

const REGISTER_ROLES: Array<{
  role: Exclude<UserRole, "admin">;
  label: string;
  tagline: string;
}> = [
  { role: "citizen", label: "Citizen", tagline: "Schedule e-waste pickups & track" },
  { role: "partner", label: "Collection Partner", tagline: "First-mile pickup & weighment" },
  { role: "recycler", label: "Recycler", tagline: "Batch intake & recycling docs" },
  { role: "organization", label: "Organization", tagline: "Bulk IT lots & EPR tracking" },
  { role: "center_manager", label: "Center Manager", tagline: "Manage hub & batch dispatch" },
];

function evaluatePasswordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
  const colors = [
    "bg-slate-200 dark:bg-slate-800",
    "bg-rose-500",
    "bg-amber-500",
    "bg-sky-500",
    "bg-emerald-500",
  ];
  return { score, label: labels[score], color: colors[score] };
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshAuth, toast, fireConfetti } = useApp();

  const redirectParam = searchParams.get("redirect");

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Registration fields
  const [fullName, setFullName] = useState("");
  const [regRole, setRegRole] = useState<Exclude<UserRole, "admin">>("citizen");
  const [city, setCity] = useState("Ludhiana");
  const [state, setState] = useState("Punjab");
  const [phone, setPhone] = useState("");
  const [organizationName, setOrganizationName] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = useMemo(() => evaluatePasswordStrength(password), [password]);

  const resolvedDestination = (role: UserRole, defaultRoute: string) => {
    if (!redirectParam?.startsWith("/") || redirectParam.startsWith("//")) return defaultRoute;
    const requestedRole = redirectParam.match(/^\/dashboard\/([^/?#]+)/)?.[1];
    if (requestedRole && requestedRole !== role && !(requestedRole === "citizen" && ["organization", "admin"].includes(role))) return defaultRoute;
    return redirectParam;
  };

  const executeLogin = async (loginEmail: string, loginPassword: string) => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid credentials.");
        return;
      }

      let sessionUser = await refreshAuth();
      if (!sessionUser) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        sessionUser = await refreshAuth();
      }
      if (!sessionUser) {
        setError("Sign-in succeeded, but session verification failed. Allow first-party cookies, clear cached site data for this origin, and try again. If this persists, check the database/session service.");
        return;
      }
      toast({
        title: `Welcome back, ${data.user.fullName}`,
        description: `Redirecting to your ${data.user.role.replace("_", " ")} dashboard.`,
        variant: "success",
      });

      router.push(resolvedDestination(data.user.role as UserRole, data.redirectTo || "/dashboard/citizen"));
      router.refresh();
    } catch {
      setError("Network error while signing in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      await executeLogin(email, password);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          fullName,
          email,
          password,
          role: regRole,
          city,
          state,
          phone,
          organizationName: organizationName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create account.");
        return;
      }

      let sessionUser = await refreshAuth();
      if (!sessionUser) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        sessionUser = await refreshAuth();
      }
      if (!sessionUser) {
        setError("Account created, but session verification failed. Allow first-party cookies, clear cached site data for this origin, and sign in again.");
        return;
      }
      fireConfetti();
      toast({
        title: "Account Created Successfully!",
        description: "Welcome to EcoTrace India.",
        variant: "success",
      });
      router.push(resolvedDestination(data.user.role as UserRole, data.redirectTo || "/dashboard/citizen"));
      router.refresh();
    } catch {
      setError("Network error during registration.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col eco-grid-bg">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Auth Card */}
          <div className="lg:col-span-6 rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] p-6 sm:p-8 shadow-2xl shadow-emerald-950/10">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-slate-950 dark:text-white">
                    {mode === "login" ? "Sign in to EcoTrace India" : "Create EcoTrace Account"}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Secure PostgreSQL session & role-based access
                  </p>
                </div>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 rounded-2xl bg-emerald-50 dark:bg-[#081712] p-1 mb-6 border border-emerald-900/10 dark:border-emerald-500/15">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                  mode === "login"
                    ? "bg-white dark:bg-emerald-900/80 text-emerald-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                  mode === "register"
                    ? "bg-white dark:bg-emerald-900/80 text-emerald-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div className="mb-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3.5 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  {/* Role Picker Cards */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Select Your Role
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {REGISTER_ROLES.map((item) => {
                        const Icon = ROLE_ICONS[item.role];
                        const active = regRole === item.role;
                        return (
                          <button
                            key={item.role}
                            type="button"
                            onClick={() => setRegRole(item.role)}
                            className={`text-left rounded-xl border p-2.5 transition-all ${
                              active
                                ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/80 ring-1 ring-emerald-500"
                                : "border-slate-200 dark:border-emerald-900 bg-white dark:bg-[#091813] hover:border-emerald-400"
                            }`}
                          >
                            <Icon
                              className={`w-4 h-4 mb-1 ${
                                active
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-slate-400"
                              }`}
                            />
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {item.label}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                              {item.tagline}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Rohan Mehta"
                        className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50/70 dark:bg-[#081712] pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        City
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50/70 dark:bg-[#081712] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        State
                      </label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50/70 dark:bg-[#081712] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {regRole !== "citizen" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Organization / Facility Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        placeholder="e.g. Punjab Eco Logistics"
                        className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50/70 dark:bg-[#081712] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91-98xxx-xxxxx"
                      className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50/70 dark:bg-[#081712] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50/70 dark:bg-[#081712] pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "login" ? "Enter your password" : "Min 8 chars, 1 uppercase, 1 number"}
                    className="w-full rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50/70 dark:bg-[#081712] pl-10 pr-11 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter during Registration */}
                {mode === "register" && password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4].map((bar) => (
                        <div
                          key={bar}
                          className={`h-1.5 rounded-full transition-colors ${
                            strength.score >= bar
                              ? strength.color
                              : "bg-slate-200 dark:bg-slate-800"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Password strength: <strong className="text-slate-800 dark:text-slate-200">{strength.label}</strong>
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-600 hover:from-emerald-700 hover:to-emerald-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-800/20 transition-all"
              >
                <span>
                  {submitting
                    ? mode === "login"
                      ? "Signing in..."
                      : "Creating account..."
                    : mode === "login"
                    ? "Sign In"
                    : "Create Account & Continue"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="mt-4 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              If sign-in reports success but does not open your dashboard, allow first-party cookies, clear cached site data for this origin, and ensure you are using the same deployment URL where the account was created.
            </p>
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-emerald-900/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                bcrypt + HTTP-only DB session
              </span>
              <Link href="/about#privacy" className="text-emerald-700 dark:text-emerald-400 hover:underline">
                Privacy Policy
              </Link>
            </div>
          </div>

          {/* Right: Secure access explanation; no development credentials exposed publicly. */}
          <div className="lg:col-span-6 space-y-5">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#052e22] via-[#064e3b] to-[#087653] p-7 sm:p-9 text-white shadow-2xl">
              <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[36px] border-lime-300/10 premium-orbit" />
              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-lime-200"><Sparkles className="h-3.5 w-3.5" /> PROTECTED ROLE ACCESS</span>
                <h2 className="mt-5 text-3xl font-extrabold premium-heading sm:text-4xl">One secure sign-in. <span className="text-lime-300">Your workspace.</span></h2>
                <p className="mt-3 text-sm leading-7 text-emerald-100/85">Enter the email and password for the role you want to access. The platform verifies them on the server, keeps your session in an HTTP-only cookie, and opens the correct dashboard automatically.</p>
                <div className="mt-6 space-y-3">
                  {[
                    "Choose a portal for citizens, partners, recyclers, organizations, center managers or administrators.",
                    "Enter credentials in the secure form; account passwords are never shown on this website.",
                    "Continue directly to the requested dashboard, or return to the role that matches your account.",
                  ].map((step, index) => <div key={step} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/8 p-3.5"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-lime-300 text-xs font-extrabold text-emerald-950">{index + 1}</span><p className="text-xs leading-relaxed text-emerald-50/90">{step}</p></div>)}
                </div>
                <Link href="/dashboards" className="premium-button mt-6 inline-flex items-center gap-2 rounded-xl bg-lime-300 px-5 py-3 text-xs font-extrabold text-[#06402c]">Browse the six portals <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-3xl border border-emerald-900/10 dark:border-emerald-400/15 bg-white dark:bg-[#0d1f19] shadow-sm">
              <div className="h-39 bg-cover bg-center" style={{ backgroundImage: "url('/images/ewaste-facility.jpg')" }} aria-hidden="true" />
              <div className="p-5"><p className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white"><CheckCircle2 className="h-4 w-4 text-emerald-600" />One accountable journey</p><p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">From customer photo and pickup to measured collection, recycler documentation and a private sample settlement statement. Need help? <Link href="/journey/tablet" className="font-bold text-emerald-700 dark:text-emerald-300 underline">Explore the tablet journey</Link>.</p></div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
          Loading EcoTrace authentication...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
