// Di HP, keyboard virtual bisa menutupi kolom yang sedang diketik — terutama di form
// bottom-sheet (Detail Temuan/Aset). Setelah keyboard muncul, gulir kolom aktif ke
// tengah area yang terlihat. Hanya untuk layar sentuh supaya di desktop halaman
// tidak melompat saat mengklik kolom.
const FIELD_SELECTOR =
  'textarea, select, input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=color]):not([type=range])'

// Perkiraan durasi animasi keyboard muncul
const KEYBOARD_DELAY_MS = 300

function activeField(): HTMLElement | null {
  const el = document.activeElement
  return el instanceof HTMLElement && (el.matches(FIELD_SELECTOR) || el.isContentEditable) ? el : null
}

function reveal() {
  activeField()?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

export function keepFocusedFieldVisible() {
  if (typeof window === 'undefined' || !window.matchMedia('(pointer: coarse)').matches) return
  document.addEventListener('focusin', () => {
    if (activeField()) setTimeout(reveal, KEYBOARD_DELAY_MS)
  })
  // Keyboard muncul/hilang mengubah tinggi visual viewport
  window.visualViewport?.addEventListener('resize', () => setTimeout(reveal, 50))
}
