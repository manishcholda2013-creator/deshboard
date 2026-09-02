/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#212121',
        sidebar: '#171717',
        sidebarHover: '#1f1f1f',
        sidebarActive: '#2a2a2a',
        inputBg: '#2f2f2f',
        inputBorder: '#3a3a3a',
        accent: '#19c37d',
        accentDim: '#0d8a5c',
        userBubble: '#2f2f2f',
        muted: '#9b9b9b',
        softText: '#c7c7c7',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        waveBar: {
          '0%, 100%': { transform: 'scaleY(0.25)' },
          '50%': { transform: 'scaleY(1)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(25, 195, 125, 0.45)' },
          '50%': { boxShadow: '0 0 0 10px rgba(25, 195, 125, 0)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      animation: {
        'wave-bar': 'waveBar 1.2s ease-in-out infinite',
        'glow-pulse': 'glowPulse 1.6s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        blink: 'blink 1s step-end infinite',
      },
    },
  },
  plugins: [],
};
