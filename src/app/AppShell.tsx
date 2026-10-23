import { Outlet, Link } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { useIsAdmin } from '../features/admin/useIsAdmin'
import SyncStatusBanner from '../features/sync/SyncStatusBanner'
import { useTranslation } from '../i18n/LanguageContext'
import { useTheme } from '../i18n/ThemeContext'
import LanguageToggle from '../i18n/LanguageToggle'

export default function AppShell() {
  const { user, logout } = useAuth()
  const { isAdmin } = useIsAdmin()
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="flex min-h-full flex-col bg-white dark:bg-slate-900">
      <SyncStatusBanner />
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <Link to="/" className="text-lg font-bold text-slate-900 dark:text-white">
          {t('app.name')}
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/standards"
            className="hidden text-sm font-medium text-slate-600 dark:text-slate-300 sm:inline"
          >
            {t('app.standards')}
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={t('theme.toggle')}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-base dark:border-slate-600"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <LanguageToggle />
          {isAdmin && (
            <Link to="/admin" className="text-sm font-medium text-slate-700 underline dark:text-slate-300">
              {t('app.admin')}
            </Link>
          )}
          <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:inline">{user?.email}</span>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-300"
          >
            {t('app.logout')}
          </button>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
