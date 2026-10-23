import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from '../../i18n/LanguageContext'

export default function AdminLayout() {
  const { t } = useTranslation()

  const TABS = [
    { to: '/admin/users', label: t('admin.tabUsers') },
    { to: '/admin/projects', label: t('admin.tabProjects') },
    { to: '/admin/photos', label: t('admin.tabPhotos') },
    { to: '/admin/categories', label: t('admin.tabCategories') },
    { to: '/admin/storage', label: t('admin.tabStorage') },
  ]

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-4 py-2">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
                isActive ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
