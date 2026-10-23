// Pilihan cepat untuk field lantai denah
export const FLOOR_SUGGESTIONS = [
  'Basement 2',
  'Basement 1',
  'Ground Floor',
  'Mezzanine',
  'Lantai 1',
  'Lantai 2',
  'Lantai 3',
  'Lantai 4',
  'Lantai 5',
  'Roof',
]

// Tebak lantai dari nama file/denah, mis. "DENAH GROUND FLOOR.pdf" -> "Ground Floor",
// "LT.2 - Elektrikal" -> "Lantai 2". Kosong kalau tidak ada petunjuk.
export function guessFloorFromName(name: string): string {
  const n = name.toLowerCase().replace(/[_\-.]+/g, ' ')
  const basement = n.match(/\b(?:basement|bsmt)\s*(\d+)?\b/) ?? n.match(/\bb(\d)\b/)
  if (basement) return basement[1] ? `Basement ${basement[1]}` : 'Basement'
  if (/\b(?:ground(?:\s*floor)?|gf|lantai\s*dasar|lt\s*dasar)\b/.test(n)) return 'Ground Floor'
  if (/\bmezz(?:anine)?\b/.test(n)) return 'Mezzanine'
  if (/\b(?:roof(?:\s*top)?|atap|rooftop)\b/.test(n)) return 'Roof'
  const numbered =
    n.match(/\b(?:lantai|lt|floor|flr|fl|level|lvl|l)\s*(\d{1,3})\b/) ??
    n.match(/\b(\d{1,3})(?:st|nd|rd|th)\s*(?:floor|fl)\b/)
  if (numbered) return `Lantai ${Number(numbered[1])}`
  return ''
}

// Urutan logis lantai: basement terdalam dulu, ground, mezzanine, lantai bernomor,
// roof, lalu lantai lain (alfabet), dan "tanpa lantai" paling akhir.
function floorRank(floor: string): [number, number, string] {
  const f = floor.trim().toLowerCase()
  if (!f) return [9, 0, '']
  const b = f.match(/^basement\s*(\d+)?$/)
  if (b) return [0, -(Number(b[1] ?? 1)), f]
  if (f === 'ground floor' || f === 'lantai dasar') return [1, 0, f]
  if (f === 'mezzanine') return [2, 0, f]
  const num = f.match(/^(?:lantai|floor|level)\s*(\d+)$/)
  if (num) return [3, Number(num[1]), f]
  if (f === 'roof' || f === 'atap') return [4, 0, f]
  return [5, 0, f]
}

export function compareFloors(a: string, b: string): number {
  const [ga, na, sa] = floorRank(a)
  const [gb, nb, sb] = floorRank(b)
  return ga - gb || na - nb || sa.localeCompare(sb)
}
