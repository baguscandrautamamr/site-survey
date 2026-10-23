import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProjects } from './useProjects'
import { useTranslation } from '../../i18n/LanguageContext'

export default function ProjectListPage() {
  const { projects, loading, createProject, deleteProject } = useProjects()
  const { t } = useTranslation()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onDelete = (projectId: string, projectName: string) => {
    if (window.confirm(t('projects.deleteConfirm', { name: projectName }))) {
      deleteProject(projectId)
    }
  }

  const onCreate = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await createProject(name.trim())
      setName('')
      setShowForm(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('projects.title')}</h1>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
        >
          {t('projects.new')}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 flex gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('projects.namePlaceholder')}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
          <button
            type="button"
            onClick={onCreate}
            disabled={submitting}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
          >
            {t('projects.save')}
          </button>
        </div>
      )}

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">{t('app.loading')}</p>}

      {!loading && projects.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('projects.empty')}</p>
      )}

      <ul className="space-y-2">
        {projects.map((project) => (
          <li key={project.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <Link
              to={`/projects/${project.id}`}
              className="flex-1 p-4 active:bg-slate-50 dark:active:bg-slate-700"
            >
              <span className="font-semibold text-slate-900 dark:text-white">{project.name}</span>
            </Link>
            <button
              type="button"
              onClick={() => onDelete(project.id, project.name)}
              aria-label={t('projects.delete')}
              className="mr-3 shrink-0 rounded-lg border border-red-300 px-2 py-1.5 text-xs font-medium text-red-600 dark:border-red-800 dark:text-red-400"
            >
              &#128465;
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
