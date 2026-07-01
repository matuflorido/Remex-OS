import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // ESTO ES CLAVE PARA QUE FUNCIONE EL .EXE (Rutas relativas)
  base: './',
  plugins: [
    react(),
    tailwindcss(),
  ],
})