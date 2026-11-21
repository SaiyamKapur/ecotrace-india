// Client-safe language options. Server-side AI and database code live elsewhere.
// Live model quality varies by language; seven languages have curated local fallback replies.
export type ChatLanguage =
  | "auto" | "en" | "hi" | "pa" | "bn" | "mr" | "ta" | "te"
  | "gu" | "kn" | "ml" | "or" | "ur"
  | "es" | "fr" | "ar" | "de" | "pt" | "zh" | "ja" | "ko";

export const CHAT_LANGUAGES: { id: ChatLanguage; label: string; native: string; speech: string }[] = [
  { id: "auto", label: "Auto detect", native: "🌐 Auto detect", speech: "en-IN" },
  { id: "en", label: "English", native: "English", speech: "en-IN" },
  { id: "hi", label: "Hindi", native: "हिन्दी", speech: "hi-IN" },
  { id: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ", speech: "pa-IN" },
  { id: "bn", label: "Bengali", native: "বাংলা", speech: "bn-IN" },
  { id: "mr", label: "Marathi", native: "मराठी", speech: "mr-IN" },
  { id: "ta", label: "Tamil", native: "தமிழ்", speech: "ta-IN" },
  { id: "te", label: "Telugu", native: "తెలుగు", speech: "te-IN" },
  { id: "gu", label: "Gujarati", native: "ગુજરાતી", speech: "gu-IN" },
  { id: "kn", label: "Kannada", native: "ಕನ್ನಡ", speech: "kn-IN" },
  { id: "ml", label: "Malayalam", native: "മലയാളം", speech: "ml-IN" },
  { id: "or", label: "Odia", native: "ଓଡ଼ିଆ", speech: "or-IN" },
  { id: "ur", label: "Urdu", native: "اردو", speech: "ur-IN" },
  { id: "es", label: "Spanish", native: "Español", speech: "es-ES" },
  { id: "fr", label: "French", native: "Français", speech: "fr-FR" },
  { id: "ar", label: "Arabic", native: "العربية", speech: "ar-SA" },
  { id: "de", label: "German", native: "Deutsch", speech: "de-DE" },
  { id: "pt", label: "Portuguese", native: "Português", speech: "pt-BR" },
  { id: "zh", label: "Chinese", native: "中文", speech: "zh-CN" },
  { id: "ja", label: "Japanese", native: "日本語", speech: "ja-JP" },
  { id: "ko", label: "Korean", native: "한국어", speech: "ko-KR" },
];
