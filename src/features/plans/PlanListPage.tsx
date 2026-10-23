import { useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { usePlans } from './usePlans'
import { usePlanFolders, type PlanFolder } from './planFolders'
import PlanUploadButton from './PlanUploadButton'
import { compareFloors } from './floors'
import { exportProjectExcel } from '../export/exportProjectExcel'
import { useTranslation } from '../../i18n/LanguageContext'
import type { Plan } from '../../types/models'

type SortKey = 'createdDesc' | 'createdAsc' | 'nameAsc' | 'nameDesc'
type ViewMode = 'grid' | 'list'

// createdAt bisa berupa number atau Firestore Timestamp saat runtime
function createdMs(plan: Plan): number {
  const v = plan.createdAt as unknown
  if (typeof v === 'number') return v
  if (v && typeof (v as { toMillis?: () => number }).toMillis === 'function') {
    return (v as { toMillis: () => number }).toMillis()
  }
  return 0
}

function Dropdown({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute left-0 top-full z-40 mt-1 min-w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
        {children}
      </div>
    </>
  )
}

function MenuItem({ onClick, children, danger }: { onClick: () => void; children: ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
        danger ? 'text-red-600' : 'text-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

function ChevronDown({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export default function PlanListPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { plans, loading, uploading, uploadPlan, deletePlan, setPlansFloor } = usePlans(projectId)
  const {
    folders,
    assignments,
    collapsed,
    createFolder,
    renameFolder,
    deleteFolder,
    movePlans,
    toggleCollapsed,
    setAllCollapsed,
  } = usePlanFolders(projectId)
  const { t } = useTranslation()

  const [view, setView] = useState<ViewMode>('grid')
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sort, setSort] = useState<SortKey>('createdDesc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const [exporting, setExporting] = useState(false)

  const closeMenu = () => setOpenMenu(null)

  const existingFloors = useMemo(
    () => [...new Set(plans.map((p) => p.floor?.trim() ?? '').filter(Boolean))].sort(compareFloors),
    [plans],
  )

  const onExport = async () => {
    if (!projectId) return
    setExporting(true)
    try {
      await exportProjectExcel(projectId, t)
    } catch (e) {
      window.alert(t('export.failed', { error: (e as Error).message }))
    } finally {
      setExporting(false)
    }
  }

  const onSetFloorSelected = async () => {
    closeMenu()
    if (selected.size === 0) {
      window.alert(t('plans.selectPlansFirst'))
      return
    }
    const current = plans.find((p) => selected.has(p.id))?.floor ?? ''
    const floor = window.prompt(t('plans.floorPrompt', { count: selected.size }), current)
    if (floor === null) return
    await setPlansFloor([...selected], floor.trim())
    setSelected(new Set())
  }

  const visiblePlans = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q ? plans.filter((p) => p.name.toLowerCase().includes(q)) : [...plans]
    filtered.sort((a, b) => {
      switch (sort) {
        case 'createdAsc':
          return createdMs(a) - createdMs(b)
        case 'nameAsc':
          return a.name.localeCompare(b.name)
        case 'nameDesc':
          return b.name.localeCompare(a.name)
        default:
          return createdMs(b) - createdMs(a)
      }
    })
    return filtered
  }, [plans, search, sort])

  const folderIds = new Set(folders.map((f) => f.id))
  const sections: Array<{ key: string; folder: PlanFolder | null; plans: Plan[] }> = [
    ...folders.map((f) => ({
      key: f.id,
      folder: f,
      plans: visiblePlans.filter((p) => assignments[p.id] === f.id),
    })),
    {
      key: 'unfiled',
      folder: null,
      plans: visiblePlans.filter((p) => !assignments[p.id] || !folderIds.has(assignments[p.id])),
    },
  ]

  const toggleSelect = (planId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(planId)) next.delete(planId)
      else next.add(planId)
      return next
    })
  }

  const toggleSelectSection = (sectionPlans: Plan[]) => {
    const allSelected = sectionPlans.length > 0 && sectionPlans.every((p) => selected.has(p.id))
    setSelected((prev) => {
      const next = new Set(prev)
      for (const p of sectionPlans) {
        if (allSelected) next.delete(p.id)
        else next.add(p.id)
      }
      return next
    })
  }

  const onNewFolder = () => {
    const name = window.prompt(t('plans.folderNamePrompt'))
    if (name?.trim()) createFolder(name.trim())
  }

  const onRenameFolder = (folder: PlanFolder) => {
    closeMenu()
    const name = window.prompt(t('plans.folderNamePrompt'), folder.name)
    if (name?.trim()) renameFolder(folder.id, name.trim())
  }

  const onDeleteFolder = (folder: PlanFolder) => {
    closeMenu()
    if (window.confirm(t('plans.deleteFolderConfirm', { name: folder.name }))) {
      deleteFolder(folder.id)
    }
  }

  const onMoveSelected = (folderId: string | null) => {
    closeMenu()
    movePlans([...selected], folderId)
    setSelected(new Set())
  }

  const onDeleteSelected = async () => {
    closeMenu()
    if (selected.size === 0) return
    if (window.confirm(t('plans.deleteSelectedConfirm', { count: selected.size }))) {
      for (const planId of selected) {
        await deletePlan(planId)
      }
      setSelected(new Set())
    }
  }

  const uploadInto =
    (folderId: string | null) =>
    async (name: string, file: File, floor: string) => {
      const newId = await uploadPlan(name, file, floor)
      if (newId && folderId) movePlans([newId], folderId)
    }

  const filterChip = (key: string, label: string, content: ReactNode) => (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpenMenu(openMenu === key ? null : key)}
        className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
      >
        {label}
        <ChevronDown className="h-3 w-3" />
      </button>
      <Dropdown open={openMenu === key} onClose={closeMenu}>
        {content}
      </Dropdown>
    </div>
  )

  const sortOptions = (
    <>
      <MenuItem
        onClick={() => {
          setSort('createdDesc')
          closeMenu()
        }}
      >
        {sort === 'createdDesc' ? '✓ ' : ''}
        {t('plans.sortNewest')}
      </MenuItem>
      <MenuItem
        onClick={() => {
          setSort('createdAsc')
          closeMenu()
        }}
      >
        {sort === 'createdAsc' ? '✓ ' : ''}
        {t('plans.sortOldest')}
      </MenuItem>
      <MenuItem
        onClick={() => {
          setSort('nameAsc')
          closeMenu()
        }}
      >
        {sort === 'nameAsc' ? '✓ ' : ''}
        {t('plans.sortNameAsc')}
      </MenuItem>
      <MenuItem
        onClick={() => {
          setSort('nameDesc')
          closeMenu()
        }}
      >
        {sort === 'nameDesc' ? '✓ ' : ''}
        {t('plans.sortNameDesc')}
      </MenuItem>
    </>
  )

  return (
    <div className="p-4">
      <h1 className="mb-3 text-xl font-bold text-slate-900">{t('plans.title')}</h1>

      {/* Toolbar utama ala Fieldwire */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <PlanUploadButton uploading={uploading} onUpload={uploadInto(null)} existingFloors={existingFloors} />

        <button
          type="button"
          onClick={onExport}
          disabled={exporting || plans.length === 0}
          className="flex items-center gap-1.5 rounded-lg bg-green-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
          </svg>
          {exporting ? t('export.exporting') : t('export.button')}
        </button>

        <button
          type="button"
          onClick={onNewFolder}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9L9.2 3.9A2 2 0 0 0 7.5 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
            <path d="M12 10v6M9 13h6" />
          </svg>
          {t('plans.newFolder')}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'actions' ? null : 'actions')}
            className="flex items-center gap-1 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t('plans.actions')}
            <ChevronDown />
          </button>
          <Dropdown open={openMenu === 'actions'} onClose={closeMenu}>
            {folders.map((f) => (
              <MenuItem key={f.id} onClick={() => onMoveSelected(f.id)}>
                {t('plans.moveTo', { name: f.name })}
              </MenuItem>
            ))}
            <MenuItem onClick={() => onMoveSelected(null)}>{t('plans.moveToUnfiled')}</MenuItem>
            <div className="my-1 border-t border-slate-100" />
            <MenuItem onClick={onSetFloorSelected}>{t('plans.setFloor', { count: selected.size })}</MenuItem>
            <div className="my-1 border-t border-slate-100" />
            <MenuItem danger onClick={onDeleteSelected}>
              {t('plans.deleteSelected', { count: selected.size })}
            </MenuItem>
          </Dropdown>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-pressed={filtersOpen}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${
              filtersOpen
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            {t('plans.filters')}
          </button>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('plans.search')}
            className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none sm:w-52"
          />

          <div className="flex flex-col overflow-hidden rounded-lg border border-slate-300">
            <button
              type="button"
              onClick={() => setAllCollapsed(false)}
              aria-label={t('plans.expandAll')}
              className="flex h-[19px] w-8 items-center justify-center text-slate-600 hover:bg-slate-100"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setAllCollapsed(true)}
              aria-label={t('plans.collapseAll')}
              className="flex h-[19px] w-8 items-center justify-center border-t border-slate-300 text-slate-600 hover:bg-slate-100"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 15l6-6 6 6" />
              </svg>
            </button>
          </div>

          <div className="flex overflow-hidden rounded-lg border border-slate-300">
            <button
              type="button"
              onClick={() => setView('grid')}
              aria-label={t('plans.gridView')}
              aria-pressed={view === 'grid'}
              className={`flex h-9 w-10 items-center justify-center ${
                view === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <rect x="3" y="3" width="8" height="8" rx="1" />
                <rect x="13" y="3" width="8" height="8" rx="1" />
                <rect x="3" y="13" width="8" height="8" rx="1" />
                <rect x="13" y="13" width="8" height="8" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              aria-label={t('plans.listView')}
              aria-pressed={view === 'list'}
              className={`flex h-9 w-10 items-center justify-center border-l border-slate-300 ${
                view === 'list' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Baris filter ala Fieldwire */}
      {filtersOpen && (
        <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          {filterChip(
            'tags',
            t('plans.tags'),
            <p className="px-3 py-2 text-sm text-slate-400">{t('plans.noTags')}</p>,
          )}
          {filterChip(
            'version',
            t('plans.version'),
            <p className="px-3 py-2 text-sm text-slate-400">{t('plans.allVersions')}</p>,
          )}
          {filterChip('created', t('plans.createdDate'), sortOptions)}
          {filterChip('modified', t('plans.lastModified'), sortOptions)}
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">{t('app.loading')}</p>}

      {!loading && plans.length === 0 && (
        <p className="text-sm text-slate-500">{t('plans.empty')}</p>
      )}

      {!loading &&
        sections.map(({ key, folder, plans: sectionPlans }) => {
          // Sembunyikan section "Unfiled" jika kosong dan ada folder lain
          if (!folder && sectionPlans.length === 0 && folders.length > 0 && search) return null
          const isCollapsed = !!collapsed[key]
          const allSelected = sectionPlans.length > 0 && sectionPlans.every((p) => selected.has(p.id))
          return (
            <section key={key} className="mb-4">
              <div className="flex items-center gap-2 border-b border-slate-100 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => toggleSelectSection(sectionPlans)}
                  aria-label={t('plans.selectAll')}
                  className="h-4 w-4 accent-blue-600"
                />
                <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9L9.2 3.9A2 2 0 0 0 7.5 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                </svg>
                <span className="text-sm font-semibold text-slate-900">
                  {folder ? folder.name : t('plans.unfiled')}
                </span>
                <span className="text-sm text-slate-400">
                  {t('plans.planCount', { count: sectionPlans.length })}
                </span>
                <button
                  type="button"
                  onClick={() => toggleCollapsed(key)}
                  aria-label={isCollapsed ? t('plans.expandAll') : t('plans.collapseAll')}
                  aria-expanded={!isCollapsed}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  <span className={`transition-transform ${isCollapsed ? '-rotate-90' : ''}`}>
                    <ChevronDown />
                  </span>
                </button>
                {folder && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenMenu(openMenu === `folder-${folder.id}` ? null : `folder-${folder.id}`)}
                      aria-label={t('plans.folderMenu')}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50"
                    >
                      &#8942;
                    </button>
                    <Dropdown open={openMenu === `folder-${folder.id}`} onClose={closeMenu}>
                      <MenuItem onClick={() => onRenameFolder(folder)}>{t('plans.renameFolder')}</MenuItem>
                      <MenuItem danger onClick={() => onDeleteFolder(folder)}>
                        {t('plans.deleteFolder')}
                      </MenuItem>
                    </Dropdown>
                  </div>
                )}
              </div>

              {!isCollapsed &&
                (view === 'grid' ? (
                  <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {sectionPlans.map((plan) => (
                      <li key={plan.id} className="relative">
                        <Link
                          to={`/projects/${projectId}/plans/${plan.id}`}
                          className={`block overflow-hidden rounded-lg border active:opacity-80 ${
                            selected.has(plan.id) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
                          }`}
                        >
                          <img src={plan.imageURL} alt={plan.name} className="aspect-square w-full object-cover" />
                          <span className="block truncate px-2 pt-2 text-sm font-medium text-slate-900">{plan.name}</span>
                          <span className={`block truncate px-2 pb-2 text-xs ${plan.floor ? 'text-blue-700' : 'text-slate-400'}`}>
                            {plan.floor || t('export.noFloor')}
                          </span>
                        </Link>
                        <input
                          type="checkbox"
                          checked={selected.has(plan.id)}
                          onChange={() => toggleSelect(plan.id)}
                          aria-label={plan.name}
                          className="absolute left-2 top-2 h-4 w-4 rounded bg-white accent-blue-600 shadow"
                        />
                      </li>
                    ))}
                    <li>
                      <PlanUploadButton
                        uploading={uploading}
                        onUpload={uploadInto(folder ? folder.id : null)}
                        existingFloors={existingFloors}
                        variant="tile"
                      />
                    </li>
                  </ul>
                ) : (
                  <ul className="mt-1 divide-y divide-slate-100">
                    {sectionPlans.map((plan) => (
                      <li key={plan.id} className="flex items-center gap-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(plan.id)}
                          onChange={() => toggleSelect(plan.id)}
                          aria-label={plan.name}
                          className="h-4 w-4 accent-blue-600"
                        />
                        <Link
                          to={`/projects/${projectId}/plans/${plan.id}`}
                          className="flex min-w-0 flex-1 items-center gap-3"
                        >
                          <img src={plan.imageURL} alt="" className="h-10 w-10 rounded object-cover" />
                          <span className="truncate text-sm font-medium text-slate-900">{plan.name}</span>
                          {plan.floor && (
                            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                              {plan.floor}
                            </span>
                          )}
                          <span className="ml-auto shrink-0 text-xs text-slate-400">
                            {createdMs(plan) ? new Date(createdMs(plan)).toLocaleDateString() : ''}
                          </span>
                        </Link>
                      </li>
                    ))}
                    {sectionPlans.length === 0 && (
                      <li className="py-2 text-sm text-slate-400">{t('plans.folderEmpty')}</li>
                    )}
                  </ul>
                ))}
            </section>
          )
        })}
    </div>
  )
}
