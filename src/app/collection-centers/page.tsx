import React from "react";
import { MapPin } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { CentersExplorer } from "@/components/centers-explorer";

export const dynamic = "force-dynamic";

export default function CollectionCentersPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-[#052e22] via-[#064e3b] to-[#065f46] text-white py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5" />
              Drop-Off Network Directory
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Find an E-Waste Collection Point
            </h1>
            <p className="text-sm sm:text-base text-emerald-100/85 max-w-3xl">
              Explore Punjab sample listings across <strong>Phagwara, Goraya, Banga, Kapurthala, Hoshiarpur, Jalandhar, Ludhiana, Amritsar, Mohali and Patiala</strong>. Filter accepted devices, see hours and contact the platform before arranging a visit.
            </p>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <CentersExplorer />
        </section>
      </main>
      <Footer />
    </div>
  );
}
