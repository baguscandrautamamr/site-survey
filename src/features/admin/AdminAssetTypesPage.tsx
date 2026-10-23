import { useEffect, useState } from 'react'
import {
  addAssetType,
  deleteAssetType,
  renameAssetType,
  seedDefaultAssetTypesIfEmpty,
  useAssetTypes,
} from '../assets/useAssetTypes'
import { useTranslation } from '../../i18n/LanguageContext'

export default function AdminAssetTypesPage() {
  const { assetTypes, loading } = useAssetTypes()
  const { t } = useTranslation()
  const [name, setName] = useState('')

  useEffect(() => {
    seedDefaultAssetTypesIfEmpty()
  }, [])

  const onAdd = async () => {
    if (!name.trim()) return
    await addAssetType(name.trim())
    setName('')
  }

  const onRename = (id: string, currentName: string) => {
    const next = window.prompt(t('adminAssetTypes.renamePrompt'), currentName)
    if (next && next.trim() && next.trim() !== currentName) {
      renameAssetType(id, next.trim())
    }
  }

  const onDelete = (id: string, typeName: string) => {
    if (window.confirm(t('adminAssetTypes.deleteConfirm', { name: typeName }))) {
      deleteAssetType(id)
    }
  }

  return (
    <div className="p-4">
      <h1 className="mb-1 text-xl font-bold text-slate-900">{t('adminAssetTypes.title')}</h1>
      <p className="mb-3 text-sm text-slate-500">{t('adminAssetTypes.help')}</p>

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 p-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('adminAssetTypes.namePlaceholder')}
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
        {assetTypes.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
          >
            <span className="truncate text-sm font-semibold text-slate-900">{a.name}</span>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => onRename(a.id, a.name)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                {t('adminCategories.rename')}
              </button>
              <button
                type="button"
                onClick={() => onDelete(a.id, a.name)}
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
