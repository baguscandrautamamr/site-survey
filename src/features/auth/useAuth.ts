import { create } from 'zustand'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../firebase/config'

interface AuthState {
  user: User | null
  initializing: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  initializing: true,
  error: null,
  login: async (email, password) => {
    set({ error: null })
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },
  register: async (email, password) => {
    set({ error: null })
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await setDoc(doc(db, 'users', cred.user.uid), {
        email: cred.user.email,
        displayName: cred.user.email?.split('@')[0] ?? '',
        role: 'member',
        createdAt: serverTimestamp(),
      })
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },
  logout: async () => {
    await signOut(auth)
  },
}))

onAuthStateChanged(auth, (user) => {
  useAuth.setState({ user, initializing: false })
})
