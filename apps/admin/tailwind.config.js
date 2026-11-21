export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'], darkMode: 'class',
  theme: { extend: {
    colors: { brand: { DEFAULT: '#0F8A4F', dark: '#0A6B3C', soft: '#E3F5EA', deep: '#0A3D25' }, amber: { DEFAULT: '#F59E0B' }, ink: '#0B1B13' },
    fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    boxShadow: { card: '0 1px 2px rgba(11,27,19,.04), 0 8px 24px rgba(11,27,19,.06)' },
  } },
};
