import { useTranslation } from './LanguageContext'

export default function LanguageToggle() {
  const { lang, setLang } = useTranslation()

  return (
    <div className="flex shrink-0 overflow-hidden rounded-lg border border-slate-300 text-xs font-semibold dark:border-slate-600">
      <button
        type="button"
        onClick={() => setLang('id')}
        className={`px-2 py-1 ${lang === 'id' ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900' : 'text-slate-600 dark:text-slate-400'}`}
      >
        ID
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-2 py-1 ${lang === 'en' ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900' : 'text-slate-600 dark:text-slate-400'}`}
      >
        EN
      </button>
    </div>
  )
}
