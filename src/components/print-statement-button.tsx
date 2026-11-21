"use client";

import { Printer } from "lucide-react";

export function PrintStatementButton() {
  return <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-600 transition-colors"><Printer className="h-4 w-4" />Print / save statement</button>;
}
