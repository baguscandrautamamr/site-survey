import { useState } from 'react'
import { Link } from 'react-router-dom'
import { STATUS_COLORS } from '../plan-viewer/usePins'
import { colorForCategory } from '../categories/useCategories'
import { useTranslation } from '../../i18n/LanguageContext'
import type { Category, Pin, Plan, Task, TaskStatus } from '../../types/models'

export type BoardItem =
  | { kind: 'pin'; number: number; pin: Pin; plan: Plan | undefined }
  | { kind: 'task'; number: number; task: Task }

const STATUSES: TaskStatus[] = ['open', 'in_progress', 'done']

interface Props {
  item: BoardItem
  projectId: string
  categories: Category[]
  onClose: () => void
  onUpdatePin: (planId: string, pinId: string, data: Partial<Pick<Pin, 'status' | 'category' | 'notes'>>) => Promise<void>
  onUpdateTask: (taskId: string, data: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority'>>) => Promise<void>
  onDeleteTask: (taskId: string) => Promise<void>
}

export default function TaskDetailModal({
  item,
  projectId,
  categories,
  onClose,
  onUpdatePin,
  onUpdateTask,
  onDeleteTask,
}: Props) {
  const { t } = useTranslation()
  const isPin = item.kind === 'pin'
  const [notes, setNotes] = useState(isPin ? item.pin.notes : item.task.description)
  const [title, setTitle] = useState(isPin ? '' : item.task.title)
  const [saving, setSaving] = useState(false)

  const status = isPin ? item.pin.status : item.task.status

  const setStatus = async (next: TaskStatus) => {
    if (isPin) await onUpdatePin(item.pin.planId, item.pin.id, { status: next })
    else await onUpdateTask(item.task.id, { status: next })
  }

  const saveText = async () => {
    setSaving(true)
    try {
      if (isPin) await onUpdatePin(item.pin.planId, item.pin.id, { notes })
      else await onUpdateTask(item.task.id, { title: title.trim() || item.task.title, description: notes })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {isPin ? t('board.pinTitle', { number: item.number }) : t('board.taskTitle', { number: item.number })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('tasks.cancel')}
            className="text-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            &times;
          </button>
        </div>

        <div className="flex flex-col gap-4 p-4">
          {/* Lokasi di denah, seperti Fieldwire */}
          {isPin && item.plan && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t('board.location', { plan: item.plan.name })}
                </span>
                <Link
                  to={`/projects/${projectId}/plans/${item.pin.planId}`}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  {t('board.openInPlan')} &rarr;
                </Link>
              </div>
              <div className="relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                <img src={item.plan.imageURL} alt={item.plan.name} className="block w-full select-none" />
                <span
                  className="absolute h-4 w-4 -translate-x-1/2 -translate-y-full"
                  style={{ left: `${item.pin.x * 100}%`, top: `${item.pin.y * 100}%` }}
                >
                  <svg viewBox="0 0 24 24" fill={colorForCategory(categories, item.pin.category)} stroke="#fff" strokeWidth="1.5">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  </svg>
                </span>
              </div>
            </div>
          )}

          {!isPin && (
            <div>
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                {t('tasks.newPlaceholder')}
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
          )}

          <div>
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('pinForm.status')}
            </span>
            <div className="flex gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    status === s
                      ? 'border-transparent text-white'
                      : 'border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300'
                  }`}
                  style={status === s ? { backgroundColor: STATUS_COLORS[s] } : undefined}
                >
                  {t(`status.${s}`)}
                </button>
              ))}
            </div>
          </div>

          {isPin ? (
            <div>
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                {t('pinForm.category')}
              </span>
              <select
                value={item.pin.category}
                onChange={(e) => onUpdatePin(item.pin.planId, item.pin.id, { category: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
                {!categories.some((c) => c.name === item.pin.category) && (
                  <option value={item.pin.category}>{item.pin.category}</option>
                )}
              </select>
            </div>
          ) : (
            <div>
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                {t('board.priority')}
              </span>
              <select
                value={item.task.priority}
                onChange={(e) => onUpdateTask(item.task.id, { priority: e.target.value as Task['priority'] })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                <option value="low">{t('tasks.priorityLow')}</option>
                <option value="medium">{t('tasks.priorityMedium')}</option>
                <option value="high">{t('tasks.priorityHigh')}</option>
              </select>
            </div>
          )}

          <div>
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              {isPin ? t('pinForm.notes') : t('tasks.descPlaceholder')}
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>

          {isPin && item.pin.photoURL && (
            <div>
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                {t('pinForm.photo')}
              </span>
              <img
                src={item.pin.photoURL}
                alt={t('pinForm.photoAlt')}
                className="max-h-56 w-full rounded-lg object-contain"
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
            {!isPin ? (
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm(t('tasks.deleteConfirm', { title: item.task.title }))) {
                    await onDeleteTask(item.task.id)
                    onClose()
                  }
                }}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 dark:border-red-800 dark:text-red-400"
              >
                {t('board.deleteTask')}
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-300"
              >
                {t('tasks.cancel')}
              </button>
              <button
                type="button"
                onClick={saveText}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {t('tasks.save')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
