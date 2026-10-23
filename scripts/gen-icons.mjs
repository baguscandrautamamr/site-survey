import sharp from 'sharp'
import { writeFileSync } from 'fs'

// SVG icon: map pin shape with survey clipboard inside, teal theme
const iconSvg = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Map pin -->
  <path d="M256 24 C149 24 62 111 62 218 C62 338 240 488 256 488 C272 488 450 338 450 218 C450 111 363 24 256 24Z" fill="#0f766e"/>
  <!-- Highlight -->
  <path d="M256 24 C149 24 62 111 62 218 C62 338 240 488 256 488 C272 488 450 338 450 218 C450 111 363 24 256 24Z" fill="url(#g1)"/>
  <!-- Inner circle bg -->
  <circle cx="256" cy="210" r="130" fill="#134e4a"/>
  <!-- Clipboard body -->
  <rect x="190" y="148" width="132" height="152" rx="12" fill="white"/>
  <!-- Clipboard clip -->
  <rect x="228" y="138" width="56" height="28" rx="8" fill="#0d9488"/>
  <!-- Lines on clipboard -->
  <rect x="210" y="195" width="92" height="12" rx="6" fill="#cbd5e1"/>
  <rect x="210" y="220" width="92" height="12" rx="6" fill="#cbd5e1"/>
  <rect x="210" y="245" width="60" height="12" rx="6" fill="#cbd5e1"/>
  <!-- Checkmark -->
  <polyline points="272,245 284,260 310,230" fill="none" stroke="#0d9488" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Gradient def -->
  <defs>
    <radialGradient id="g1" cx="40%" cy="35%" r="60%">
      <stop offset="0%" stop-color="white" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>
  </defs>
</svg>`

// Maskable version: full square background (no pin shape)
const maskableSvg = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0f766e"/>
  <rect width="512" height="512" fill="url(#gm)"/>
  <!-- Clipboard body -->
  <rect x="166" y="152" width="180" height="208" rx="16" fill="white"/>
  <!-- Clipboard clip -->
  <rect x="214" y="140" width="84" height="36" rx="10" fill="#0d9488"/>
  <!-- Lines -->
  <rect x="190" y="208" width="132" height="16" rx="8" fill="#cbd5e1"/>
  <rect x="190" y="238" width="132" height="16" rx="8" fill="#cbd5e1"/>
  <rect x="190" y="268" width="86" height="16" rx="8" fill="#cbd5e1"/>
  <!-- Checkmark -->
  <polyline points="284,265 300,285 338,248" fill="none" stroke="#0d9488" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
  <defs>
    <radialGradient id="gm" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="white" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>
  </defs>
</svg>`

const iconBuf = Buffer.from(iconSvg)
const maskBuf = Buffer.from(maskableSvg)

await sharp(iconBuf).resize(192, 192).png().toFile('public/icons/icon-192.png')
console.log('✓ icon-192.png')

await sharp(iconBuf).resize(512, 512).png().toFile('public/icons/icon-512.png')
console.log('✓ icon-512.png')

await sharp(maskBuf).resize(512, 512).png().toFile('public/icons/icon-maskable-512.png')
console.log('✓ icon-maskable-512.png')

await sharp(iconBuf).resize(180, 180).png().toFile('public/apple-touch-icon.png')
console.log('✓ apple-touch-icon.png')

// Update favicon.svg too
writeFileSync('public/favicon.svg', iconSvg)
console.log('✓ favicon.svg')

console.log('\nSelesai! Semua icon berhasil digenerate.')
