export type PinStatus = 'open' | 'in_progress' | 'done'
// 'finding' = temuan (punch list), 'asset' = inventaris aset dengan jumlah & kondisi.
// Pin lama tanpa field kind dianggap 'finding'.
export type PinKind = 'finding' | 'asset'
export type CountSource = 'ai' | 'manual'
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
  // Keterangan lantai (mis. "Ground Floor", "Lantai 2"); dipakai untuk rekap Excel per lantai
  floor?: string
  // Nomor revisi gambar yang sedang tampil (denah lama tanpa field ini = revisi 1)
  revision?: number
  // Gambar revisi-revisi sebelumnya, untuk dibandingkan dengan yang sekarang
  revisions?: PlanRevision[]
  // Kalibrasi skala (piksel gambar per meter), dipakai bersama semua anggota
  calibration?: { pixels: number; meters: number } | null
}

export interface PlanRevision {
  revision: number
  imagePath: string
  imageURL: string
  imageWidth: number
  imageHeight: number
  replacedAt: number
  replacedByName: string
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
  // Pengedit terakhir. Kosong untuk pin yang belum diubah sejak field ini ada
  updatedBy?: string
  updatedByName?: string
  // Foto selain foto utama (photoURL)
  extraPhotos?: PinPhoto[]
  // Ukuran yang diambil di lapangan (tinggi plafon, lebar bukaan, ...)
  measurements?: Measurement[]
  // Khusus temuan: 'deviation' = kondisi lapangan beda dengan gambar
  findingType?: FindingType
  // Khusus aset: rencana tindakan saat renovasi
  action?: AssetAction | ''
  kind?: PinKind
  // Field khusus pin aset
  assetType?: string
  quantity?: number
  damaged?: number
  missing?: number
  countSource?: CountSource
  // Titik objek yang dihitung, dinormalisasi 0..1 terhadap foto hitung
  countPoints?: CountPoint[]
  countPhotoPath?: string | null
  countPhotoURL?: string | null
  localCountPhotoPending?: boolean
}

export interface PinPhoto {
  url: string
  path: string
}

export type MeasurementUnit = 'mm' | 'cm' | 'm'
export interface Measurement {
  label: string
  value: number
  unit: MeasurementUnit
}

export type FindingType = 'general' | 'deviation'
export type AssetAction = 'keep' | 'relocate' | 'demolish' | 'replace'
export const ASSET_ACTIONS: AssetAction[] = ['keep', 'relocate', 'demolish', 'replace']

export interface CountPoint {
  // Titik tengah objek, dinormalisasi 0..1
  x: number
  y: number
  // Ukuran kotak deteksi AI (0..1). Tidak ada untuk titik yang ditambah manual
  w?: number
  h?: number
}

export type PinUpdate = Partial<
  Pick<
    Pin,
    | 'status'
    | 'category'
    | 'notes'
    | 'photoPath'
    | 'photoURL'
    | 'localPhotoPending'
    | 'assetType'
    | 'quantity'
    | 'damaged'
    | 'missing'
    | 'countSource'
    | 'countPoints'
    | 'countPhotoPath'
    | 'countPhotoURL'
    | 'localCountPhotoPending'
    | 'extraPhotos'
    | 'measurements'
    | 'findingType'
    | 'action'
  >
>

export interface AssetType {
  id: string
  name: string
  createdAt: number
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
