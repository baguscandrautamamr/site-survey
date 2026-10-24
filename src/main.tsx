import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.tsx'
import { LanguageProvider } from './i18n/LanguageContext.tsx'
import { ThemeProvider } from './i18n/ThemeContext.tsx'
import { keepFocusedFieldVisible } from './lib/keepFocusedFieldVisible'

keepFocusedFieldVisible()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
)
