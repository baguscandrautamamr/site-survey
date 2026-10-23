import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTasks } from './useTasks'
import { useProjectPins, toMs } from './useProjectPins'
import TaskDetailModal, { type BoardItem } from './TaskDetailModal'
import { STATUS_COLORS } from '../plan-viewer/usePins'
import { colorForCategory, useCategories } from '../categories/useCategories'
import { useTranslation } from '../../i18n/LanguageContext'
import type { TaskStatus } from '../../types/models'

const STATUSES: TaskStatus[] = ['open', 'in_progress', 'done']

const PRIORITY_COLORS = { low: '#94a3b8', medium: '#f59e0b', high: '#ef4444' }

export default function TaskListPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { tasks, loading: tasksLoading, createTask, updateTask, deleteTask } = useTasks(projectId)
  const { pins, plans, plansLoading, updatePin } = useProjectPins(projectId)
  const { categories } = useCategories()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<BoardItem | null>(null)

  const planById = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans])

  // Gabungkan temuan (pin berlokasi) dan tugas biasa, dinomori urut waktu dibuat — ala Fieldwire
  const items: BoardItem[] = useMemo(() => {
    const merged = [
      ...pins.map((pin) => ({ kind: 'pin' as const, pin, createdAt: toMs(pin.createdAt) })),
      ...tasks.map((task) => ({ kind: 'task' as const, task, createdAt: toMs(task.createdAt) })),
    ].sort((a, b) => a.createdAt - b.createdAt)
    return merged.map((m, i) =>
      m.kind === 'pin'
        ? { kind: 'pin', number: i + 1, pin: m.pin, plan: planById.get(m.pin.planId) }
        : { kind: 'task', number: i + 1, task: m.task },
    )
  }, [pins, tasks, planById])

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) =>
      it.kind === 'pin'
        ? it.pin.notes.toLowerCase().includes(q) ||
          it.pin.category.toLowerCase().includes(q) ||
          (it.plan?.name.toLowerCase().includes(q) ?? false)
        : it.task.title.toLowerCase().includes(q) || it.task.description.toLowerCase().includes(q),
    )
  }, [items, search])

  const itemStatus = (it: BoardItem): TaskStatus => (it.kind === 'pin' ? it.pin.status : it.task.status)

  const onNewTask = async (status: TaskStatus) => {
    const title = window.prompt(t('board.newTaskPrompt'))
    if (title?.trim()) await createTask(title.trim(), status)
  }

  const onDropTo = async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault()
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json')) as {
        kind: 'pin' | 'task'
        id: string
        planId?: string
      }
      if (data.kind === 'pin' && data.planId) await updatePin(data.planId, data.id, { status })
      else if (data.kind === 'task') await updateTask(data.id, { status })
    } catch {
      // seretan dari luar papan — abaikan
    }
  }

  // Perbarui item yang sedang terbuka di modal agar mengikuti data terbaru
  const selectedLive = useMemo(() => {
    if (!selected) return null
    return (
      items.find((it) =>
        selected.kind === 'pin'
          ? it.kind === 'pin' && it.pin.id === selected.pin.id
          : it.kind === 'task' && it.task.id === selected.task.id,
      ) ?? null
    )
  }, [selected, items])

  if (tasksLoading && plansLoading) {
    return <p className="p-4 text-sm text-slate-500 dark:text-slate-400">{t('app.loading')}</p>
  }

  return (
    <div className="p-4">
      {/* Toolbar ala Fieldwire */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onNewTask('open')}
          className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {t('board.newTask')}
        </button>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('board.search')}
          className="ml-auto w-44 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white sm:w-56"
        />
      </div>

      {items.length === 0 && (
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{t('board.empty')}</p>
      )}

      {/* Papan kanban */}
      <div className="grid auto-cols-[minmax(230px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
        {STATUSES.map((status) => {
          const columnItems = visibleItems.filter((it) => itemStatus(it) === status)
          return (
            <section
              key={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDropTo(e, status)}
              className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60"
            >
              <header className="flex items-center gap-2 border-b-2 px-1 pb-2" style={{ borderColor: STATUS_COLORS[status] }}>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t(`status.${status}`)}
                </span>
                <span className="text-xs text-slate-400">({columnItems.length})</span>
              </header>

              <ul className="mt-2 flex flex-col gap-2">
                {columnItems.map((it) => {
                  const isPin = it.kind === 'pin'
                  return (
                    <li key={isPin ? `pin-${it.pin.id}` : `task-${it.task.id}`}>
                      <button
                        type="button"
                        draggable
                        onDragStart={(e) =>
                          e.dataTransfer.setData(
                            'application/json',
                            JSON.stringify(
                              isPin
                                ? { kind: 'pin', id: it.pin.id, planId: it.pin.planId }
                                : { kind: 'task', id: it.task.id },
                            ),
                          )
                        }
                        onClick={() => setSelected(it)}
                        className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-sm hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800"
                      >
                        {isPin ? (
                          <svg
                            viewBox="0 0 24 24"
                            className="h-7 w-7 shrink-0"
                            fill={colorForCategory(categories, it.pin.category)}
                            stroke="#fff"
                            strokeWidth="1"
                          >
                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                          </svg>
                        ) : (
                          <span
                            className="h-6 w-6 shrink-0 rounded"
                            style={{ backgroundColor: PRIORITY_COLORS[it.task.priority] }}
                          />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] text-slate-400">
                            #{it.number}
                            {isPin && it.plan ? ` | ${it.plan.name}` : ''}
                          </span>
                          <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                            {isPin
                              ? it.pin.notes.trim() || it.pin.category
                              : it.task.title}
                          </span>
                        </span>
                        {isPin && it.pin.photoURL && (
                          <img
                            src={it.pin.photoURL}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded object-cover"
                          />
                        )}
                      </button>
                    </li>
                  )
                })}
                <li>
                  <button
                    type="button"
                    onClick={() => onNewTask(status)}
                    className="w-full rounded-lg border border-dashed border-slate-300 px-2 py-2 text-center text-xs font-medium text-slate-400 hover:border-blue-400 hover:text-blue-500 dark:border-slate-600"
                  >
                    {t('board.newTask')}
                  </button>
                </li>
              </ul>
            </section>
          )
        })}
      </div>

      {selectedLive && projectId && (
        <TaskDetailModal
          item={selectedLive}
          projectId={projectId}
          categories={categories}
          onClose={() => setSelected(null)}
          onUpdatePin={updatePin}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
        />
      )}
    </div>
  )
}
