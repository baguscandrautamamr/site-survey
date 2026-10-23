import { useEffect, useState } from 'react'
import {
  addCategory,
  deleteCategory,
  seedDefaultCategoriesIfEmpty,
  updateCategory,
  useCategories,
} from '../categories/useCategories'
import { useTranslation } from '../../i18n/LanguageContext'

export default function AdminCategoriesPage() {
  const { categories, loading } = useCategories()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#2563eb')

  useEffect(() => {
    seedDefaultCategoriesIfEmpty()
  }, [])

  const onAdd = async () => {
    if (!name.trim()) return
    await addCategory(name.trim(), color)
    setName('')
    setColor('#2563eb')
  }

  const onRename = (id: string, currentName: string) => {
    const next = window.prompt(t('adminCategories.renamePrompt'), currentName)
    if (next && next.trim() && next.trim() !== currentName) {
      updateCategory(id, { name: next.trim() })
    }
  }

  const onDelete = (id: string, categoryName: string) => {
    if (window.confirm(t('adminCategories.deleteConfirm', { name: categoryName }))) {
      deleteCategory(id)
    }
  }

  return (
    <div className="p-4">
      <h1 className="mb-3 text-xl font-bold text-slate-900">{t('adminCategories.title')}</h1>

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 p-3">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-10 w-10 shrink-0 rounded"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('adminCategories.namePlaceholder')}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
        />
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          {t('adminCategories.add')}
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">{t('app.loading')}</p>}

      <ul className="space-y-2">
        {categories.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
          >
            <div className="flex min-w-0 items-center gap-2">
              <input
                type="color"
                value={c.color}
                onChange={(e) => updateCategory(c.id, { color: e.target.value })}
                className="h-8 w-8 shrink-0 rounded"
              />
              <span className="truncate text-sm font-semibold text-slate-900">{c.name}</span>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => onRename(c.id, c.name)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                {t('adminCategories.rename')}
              </button>
              <button
                type="button"
                onClick={() => onDelete(c.id, c.name)}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600"
              >
                {t('adminCategories.delete')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
