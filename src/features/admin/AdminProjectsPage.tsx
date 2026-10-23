import { Link } from 'react-router-dom'
import { useAllProjects } from './useAdminData'
import { useTranslation } from '../../i18n/LanguageContext'

export default function AdminProjectsPage() {
  const { projects, loading, renameProject, deleteProject } = useAllProjects()
  const { t } = useTranslation()

  if (loading) return <p className="p-4 text-sm text-slate-500">{t('app.loading')}</p>

  const onRename = (id: string, currentName: string) => {
    const name = window.prompt(t('adminProjects.renamePrompt'), currentName)
    if (name && name.trim() && name.trim() !== currentName) {
      renameProject(id, name.trim())
    }
  }

  const onDelete = (id: string, name: string) => {
    if (window.confirm(t('adminProjects.deleteConfirm', { name }))) {
      deleteProject(id)
    }
  }

  return (
    <div className="p-4">
      <h1 className="mb-3 text-xl font-bold text-slate-900">
        {t('adminProjects.title', { count: projects.length })}
      </h1>
      <ul className="space-y-2">
        {projects.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
          >
            <Link to={`/projects/${p.id}`} className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{p.name}</p>
              <p className="text-xs text-slate-500">
                {t('adminProjects.memberCount', { count: p.memberUids.length })}
              </p>
            </Link>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => onRename(p.id, p.name)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                {t('adminProjects.rename')}
              </button>
              <button
                type="button"
                onClick={() => onDelete(p.id, p.name)}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600"
              >
                {t('adminProjects.delete')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
