import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// base './' + HashRouter so the build works on any static host / sub-path (GitHub Pages, Cloudflare Pages, Netlify).
export default defineConfig({ base: './', plugins: [react()] });
