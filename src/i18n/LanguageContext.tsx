import { createContext, useContext, useState, type ReactNode } from 'react'
import { translations, type Lang, type TranslationKey } from './translations'

const STORAGE_KEY = 'site-survey-lang'

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function readStoredLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'en' ? 'en' : 'id'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang)

  const setLang = (next: Lang) => {
    setLangState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  const t = (key: TranslationKey, vars?: Record<string, string | number>) => {
    let text: string = translations[lang][key] ?? key
    if (vars) {
      for (const [varKey, value] of Object.entries(vars)) {
        text = text.replace(`{{${varKey}}}`, String(value))
      }
    }
    return text
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider')
  return ctx
}
