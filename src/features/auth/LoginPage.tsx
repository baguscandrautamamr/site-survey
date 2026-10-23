import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { useTranslation } from '../../i18n/LanguageContext'
import LanguageToggle from '../../i18n/LanguageToggle'

interface FormValues {
  email: string
  password: string
}

export default function LoginPage() {
  const { user, initializing, login, register: registerUser, error } = useAuth()
  const { t } = useTranslation()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [submitting, setSubmitting] = useState(false)
  const [wasBanned] = useState(() => {
    const flag = sessionStorage.getItem('banned') === '1'
    if (flag) sessionStorage.removeItem('banned')
    return flag
  })
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>()

  if (!initializing && user) {
    return <Navigate to="/" replace />
  }

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(values.email, values.password)
      } else {
        await registerUser(values.email, values.password)
      }
      navigate('/')
    } catch {
      // error state already surfaced via useAuth().error
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-white p-6 dark:bg-slate-900">
      <div className="w-full max-w-sm">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('app.name')}</h1>
          <LanguageToggle />
        </div>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          {mode === 'login' ? t('login.signInTitle') : t('login.registerTitle')}
        </p>

        {wasBanned && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {t('login.banned')}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('login.email')}</label>
            <input
              type="email"
              autoComplete="email"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-slate-400"
              {...register('email', { required: t('login.emailRequired') })}
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('login.password')}</label>
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-slate-400"
              {...register('password', {
                required: t('login.passwordRequired'),
                minLength: { value: 6, message: t('login.passwordMinLength') },
              })}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-slate-900 py-3 text-base font-semibold text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
          >
            {submitting ? t('login.processing') : mode === 'login' ? t('login.signIn') : t('login.register')}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="mt-4 w-full text-center text-sm text-slate-500 underline dark:text-slate-400"
        >
          {mode === 'login' ? t('login.toRegister') : t('login.toSignIn')}
        </button>
      </div>
    </div>
  )
}
