import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useTranslation } from '../../i18n/LanguageContext'
import { useProjectMembers, type ProjectMember } from './useProjectMembers'

export default function ProjectMembersPanel() {
  const { projectId } = useParams<{ projectId: string }>()
  const { user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { members, loading, error, addMember, removeMember } = useProjectMembers(projectId)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const onAdd = async (e: FormEvent) => {
    e.preventDefault()
    const value = email.trim()
    if (!value || busy) return
    setBusy(true)
    setMessage(null)
    try {
      const result = await addMember(value)
      if (result === 'added') {
        setEmail('')
        setMessage({ kind: 'ok', text: t('members.added', { email: value }) })
      } else {
        setMessage({ kind: 'error', text: t(result === 'notFound' ? 'members.notFound' : 'members.alreadyMember', { email: value }) })
      }
    } catch (err) {
      setMessage({ kind: 'error', text: t('members.failed', { error: err instanceof Error ? err.message : String(err) }) })
    } finally {
      setBusy(false)
    }
  }

  const onRemove = async (member: ProjectMember) => {
    const isSelf = member.uid === user?.uid
    const label = member.email || member.uid
    if (!window.confirm(isSelf ? t('members.leaveConfirm') : t('members.removeConfirm', { email: label }))) return
    setMessage(null)
    try {
      await removeMember(member.uid)
      // Setelah keluar, proyek ini tidak bisa diakses lagi
      if (isSelf) navigate('/')
    } catch (err) {
      setMessage({ kind: 'error', text: t('members.failed', { error: err instanceof Error ? err.message : String(err) }) })
    }
  }

  return (
    <div className="p-4">
      <h1 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">{t('members.title')}</h1>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{t('members.help')}</p>

      <form onSubmit={onAdd} className="mb-4 flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('members.emailPlaceholder')}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? t('members.adding') : t('members.add')}
        </button>
      </form>

      {message && (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`mb-4 rounded-lg p-3 text-sm ${
            message.kind === 'error'
              ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          }`}
        >
          {message.text}
        </p>
      )}

      {error ? (
        <p className="text-sm text-red-600">{t('members.failed', { error })}</p>
      ) : loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('app.loading')}</p>
      ) : (
        <ul className="space-y-2">
          {members.map((m) => (
            <li
              key={m.uid}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {m.email || t('members.unknownUser')}
                  {m.uid === user?.uid && <span className="font-normal text-slate-400"> ({t('members.you')})</span>}
                </p>
                {m.isOwner && <p className="text-xs text-slate-400 dark:text-slate-500">{t('members.owner')}</p>}
              </div>
              {!m.isOwner && (
                <button
                  type="button"
                  onClick={() => onRemove(m)}
                  className="shrink-0 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 dark:border-red-800 dark:text-red-400"
                >
                  {m.uid === user?.uid ? t('members.leave') : t('members.remove')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
