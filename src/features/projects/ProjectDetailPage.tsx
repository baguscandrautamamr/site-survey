import { useState } from 'react'
import PlanListPage from '../plans/PlanListPage'
import TaskListPage from '../tasks/TaskListPage'
import { useTranslation } from '../../i18n/LanguageContext'

type Tab = 'plans' | 'tasks'

export default function ProjectDetailPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('plans')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'plans', label: t('project.tabPlans') },
    { key: 'tasks', label: t('project.tabTasks') },
  ]

  return (
    <div>
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 border-b-2 py-3 text-sm font-medium transition-colors ${
              tab === key
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-500 dark:text-slate-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'plans' && <PlanListPage />}
      {tab === 'tasks' && <TaskListPage />}
    </div>
  )
}
