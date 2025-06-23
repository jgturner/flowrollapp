import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwiwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwiwindcss()],
});
