import { create } from "zustand";

type Language = "en" | "hi" | "kn" | "ta";

interface I18nStore {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    "app.name": "Salemate",
    "dashboard.title": "Dashboard",
    "inventory.title": "Inventory",
    "billing.title": "Billing",
  },
  hi: {
    "app.name": "सेलमैट",
    "dashboard.title": "डैशबोर्ड",
    "inventory.title": "स्टॉक",
    "billing.title": "बिलिंग",
  },
  kn: {
    "app.name": "ಸೇಲ್‌ಮೇಟ್",
    "dashboard.title": "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    "inventory.title": "ದಾಸ್ತಾನು",
    "billing.title": "ಬಿಲ್ಲಿಂಗ್",
  },
  ta: {
    "app.name": "சேல்மேட்",
    "dashboard.title": "டாஷ்போர்டு",
    "inventory.title": "சரக்கு",
    "billing.title": "பில்லிங்",
  },
};

export const useI18n = create<I18nStore>((set, get) => ({
  language: "en",
  setLanguage: (lang) => set({ language: lang }),
  t: (key) => {
    const lang = get().language;
    return translations[lang][key] || key;
  },
}));
