import { useCallback, useEffect, useState } from 'react'

// Folder denah ala Fieldwire. Disimpan di localStorage per proyek
// sehingga skema database Firestore tidak berubah.
export interface PlanFolder {
  id: string
  name: string
  createdAt: number
}

interface FolderState {
  folders: PlanFolder[]
  assignments: Record<string, string> // planId -> folderId
  collapsed: Record<string, boolean> // folderId (atau 'unfiled') -> tertutup?
}

const EMPTY_STATE: FolderState = { folders: [], assignments: {}, collapsed: {} }

const storageKey = (projectId: string) => `site-survey-plan-folders:${projectId}`

function readState(projectId?: string): FolderState {
  if (!projectId) return EMPTY_STATE
  try {
    const raw = localStorage.getItem(storageKey(projectId))
    return raw ? { ...EMPTY_STATE, ...(JSON.parse(raw) as FolderState) } : EMPTY_STATE
  } catch {
    return EMPTY_STATE
  }
}

export function usePlanFolders(projectId?: string) {
  const [state, setState] = useState<FolderState>(() => readState(projectId))

  useEffect(() => {
    setState(readState(projectId))
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    try {
      localStorage.setItem(storageKey(projectId), JSON.stringify(state))
    } catch {
      // localStorage penuh — struktur folder tetap berlaku selama sesi berjalan
    }
  }, [state, projectId])

  const createFolder = useCallback((name: string) => {
    const id = `folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setState((s) => ({
      ...s,
      folders: [...s.folders, { id, name, createdAt: Date.now() }],
    }))
    return id
  }, [])

  const renameFolder = useCallback((id: string, name: string) => {
    setState((s) => ({
      ...s,
      folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)),
    }))
  }, [])

  const deleteFolder = useCallback((id: string) => {
    setState((s) => {
      const assignments = { ...s.assignments }
      for (const planId of Object.keys(assignments)) {
        if (assignments[planId] === id) delete assignments[planId]
      }
      return {
        ...s,
        folders: s.folders.filter((f) => f.id !== id),
        assignments,
      }
    })
  }, [])

  const movePlans = useCallback((planIds: string[], folderId: string | null) => {
    setState((s) => {
      const assignments = { ...s.assignments }
      for (const planId of planIds) {
        if (folderId) assignments[planId] = folderId
        else delete assignments[planId]
      }
      return { ...s, assignments }
    })
  }, [])

  const toggleCollapsed = useCallback((key: string) => {
    setState((s) => ({
      ...s,
      collapsed: { ...s.collapsed, [key]: !s.collapsed[key] },
    }))
  }, [])

  const setAllCollapsed = useCallback((value: boolean) => {
    setState((s) => {
      const collapsed: Record<string, boolean> = {}
      for (const f of s.folders) collapsed[f.id] = value
      collapsed['unfiled'] = value
      return { ...s, collapsed }
    })
  }, [])

  return {
    folders: state.folders,
    assignments: state.assignments,
    collapsed: state.collapsed,
    createFolder,
    renameFolder,
    deleteFolder,
    movePlans,
    toggleCollapsed,
    setAllCollapsed,
  }
}
