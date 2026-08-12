import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Deployed at the9x.ai/watermarking
  base: '/watermarking/',
  plugins: [react(), tailwindcss()],
});
