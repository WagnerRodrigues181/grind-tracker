/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          first: '#1f1f1f', // cinza escuro principal (fundo geral)
          second: '#2e2e2e', // cinza médio (cards, containers)
          third: '#ffffff', // branco (textos)
          accent: '#8b8b8b', // cinza claro (bordas, placeholders, detalhes)
        },
      },
    },
  },
  plugins: [],
};
