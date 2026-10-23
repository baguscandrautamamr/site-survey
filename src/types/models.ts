export type PinStatus = 'open' | 'in_progress' | 'done'
export type UserRole = 'admin' | 'member'

export interface Project {
  id: string
  name: string
  createdBy: string
  createdAt: number
  memberUids: string[]
}

export interface Plan {
  id: string
  projectId: string
  name: string
  imagePath: string
  imageURL: string
  imageWidth: number
  imageHeight: number
  createdBy: string
  createdAt: number
}

export interface Pin {
  id: string
  projectId: string
  planId: string
  x: number
  y: number
  status: PinStatus
  category: string
  notes: string
  photoPath: string | null
  photoURL: string | null
  localPhotoPending: boolean
  createdBy: string
  createdByName: string
  createdAt: number
  updatedAt: number
}

export interface Category {
  id: string
  name: string
  color: string
  createdAt: number
}

export interface UserProfile {
  id: string
  email: string
  displayName: string
  role: UserRole
  createdAt: number
}

export type TaskStatus = 'open' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  projectId: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  createdBy: string
  createdAt: number
  updatedAt: number
}

export interface Note {
  id: string
  projectId: string
  content: string
  createdBy: string
  createdAt: number
  updatedAt: number
}

export interface Standard {
  id: string
  name: string
  type: 'NFPA' | 'NEC' | 'SNI' | 'IEC' | 'Other'
  pdfURL: string
  pdfPublicId: string
  fileName: string
  uploadedBy: string
  createdAt: number
}
