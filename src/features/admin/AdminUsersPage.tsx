import { useAllUsers } from './useAdminData'
import { useTranslation } from '../../i18n/LanguageContext'

export default function AdminUsersPage() {
  const { users, loading, setUserRole, deleteUserProfile } = useAllUsers()
  const { t } = useTranslation()

  if (loading) return <p className="p-4 text-sm text-slate-500">{t('app.loading')}</p>

  const onDelete = (uid: string, email: string) => {
    if (window.confirm(t('adminUsers.deleteConfirm', { email }))) {
      deleteUserProfile(uid)
    }
  }

  return (
    <div className="p-4">
      <h1 className="mb-3 text-xl font-bold text-slate-900">
        {t('adminUsers.title', { count: users.length })}
      </h1>
      <ul className="space-y-2">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{u.email}</p>
              <p className="text-xs text-slate-500">
                {u.role === 'admin' ? t('adminUsers.roleAdmin') : t('adminUsers.roleMember')}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setUserRole(u.id, u.role === 'admin' ? 'member' : 'admin')}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                {u.role === 'admin' ? t('adminUsers.makeMember') : t('adminUsers.makeAdmin')}
              </button>
              <button
                type="button"
                onClick={() => onDelete(u.id, u.email)}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600"
              >
                {t('adminUsers.delete')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
