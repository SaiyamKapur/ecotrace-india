import React from "react";
import Link from "next/link";
import { Leaf, ShieldCheck, BookOpen, MapPin, BarChart3, Mail, Phone } from "lucide-react";
import { PLATFORM_CONTACT } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="bg-[#052e22] text-emerald-50 border-t border-emerald-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                <Leaf className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-lg font-extrabold tracking-tight text-white">
                  EcoTrace India
                </span>
                <span className="block text-[11px] uppercase tracking-wider text-emerald-300/80">
                  AI E-Waste Traceability
                </span>
              </div>
            </Link>
            <p className="text-sm text-emerald-100/75 leading-relaxed">
              Connecting citizens, collection partners, drop-off hubs, recyclers, and organizations
              through a transparent, auditable electronic waste lifecycle platform.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-900/70 border border-emerald-700/60 px-3 py-1.5 text-xs text-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Honest Weight & Traceability Separation</span>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-4">
              Platform Navigation
            </h3>
            <ul className="space-y-2.5 text-sm text-emerald-100/80">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home & AI E-Waste Scanner
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-white transition-colors">
                  How Collection & Delivery Works
                </Link>
              </li>
              <li><Link href="/marketplace" className="hover:text-white transition-colors">Product Studio & Wallet</Link></li>
              <li><Link href="/journey/tablet" className="hover:text-white transition-colors">Tablet: complete collection journey</Link></li>
              <li>
                <Link
                  href="/collection-centers"
                  className="hover:text-white transition-colors inline-flex items-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  Collection Centers & Punjab Hub
                </Link>
              </li>
              <li>
                <Link
                  href="/impact"
                  className="hover:text-white transition-colors inline-flex items-center gap-1.5"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                  Live Impact Analytics
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About & Transparency Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Portals */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-4">
              Role Portals & Operations
            </h3>
            <ul className="space-y-2.5 text-sm text-emerald-100/80">
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Login & Registration
                </Link>
              </li>
              <li><Link href="/dashboards" className="hover:text-white transition-colors">Explore all six dashboards</Link></li>
              <li>
                <Link href="/dashboard/citizen" className="hover:text-white transition-colors">
                  Citizen Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/partner" className="hover:text-white transition-colors">
                  Collection Partner Portal
                </Link>
              </li>
              <li>
                <Link href="/dashboard/center" className="hover:text-white transition-colors">
                  Collection Center Manager
                </Link>
              </li>
              <li>
                <Link href="/dashboard/recycler" className="hover:text-white transition-colors">
                  Recycler Operations Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/admin" className="hover:text-white transition-colors">
                  Admin Sustainability Command Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact and policies */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-4">Get in touch</h3>
            <div className="rounded-2xl bg-emerald-950/70 border border-emerald-800/70 p-4 space-y-3 text-xs text-emerald-100/80 leading-relaxed">
              <p className="text-emerald-100">Questions about pickup, devices or your journey? Our platform contact is here to help.</p>
              <a href={`mailto:${PLATFORM_CONTACT.email}`} className="flex items-center gap-2 text-sm font-bold text-white hover:text-lime-200"><Mail className="h-4 w-4 shrink-0 text-emerald-300" />{PLATFORM_CONTACT.email}</a>
              <a href={PLATFORM_CONTACT.phoneHref} className="flex items-center gap-2 text-sm font-bold text-white hover:text-lime-200"><Phone className="h-4 w-4 shrink-0 text-emerald-300" />{PLATFORM_CONTACT.phoneDisplay}</a>
              <div className="flex flex-wrap gap-3 text-emerald-300 pt-2 border-t border-emerald-800/60"><Link href="/about#privacy" className="underline hover:text-white">Privacy</Link><Link href="/about#epr" className="underline hover:text-white">Records policy</Link></div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-emerald-800/60 flex flex-col items-center justify-center text-center gap-1.5">
          <p className="text-xs sm:text-sm font-bold text-lime-300">
            Made by Saiyam Kapur (Reg. No. 12404781) • AARJU YADAV (Reg. No. 12404118) • SHILPI RAJ (Reg. No. 12403968)
          </p>
          <p className="text-xs text-emerald-200/90 font-medium">
            B.Tech | Computer Science &amp; Engineering • Lovely Professional University
          </p>
        </div>

        <div className="mt-4 pt-4 border-t border-emerald-800/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-emerald-200/70">
          <p>© {new Date().getFullYear()} EcoTrace India. Built for responsible circular e-waste traceability.</p>
          <p>PWA Enabled • PostgreSQL + Drizzle ORM • Role-Based Audit Trail</p>
        </div>
      </div>
    </footer>
  );
}
