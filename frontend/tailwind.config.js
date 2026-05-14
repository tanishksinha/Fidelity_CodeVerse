/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class', // Essential for the Admin War Room toggle
  theme: {
    extend: {
      colors: {
        // Consumer Theme (High Trust)
        fidelity: {
          green: "#007A33", // The "Converted" Signal
          dark: "#004B23",
          light: "#E6F2EB",
        },
        // War Room Theme (Dark Mode Command Center)
        warroom: {
          bg: "#0A0C0B",     // Deep Charcoal Canvas
          surface: "#1A1D1C", // Panel Backgrounds
          border: "#2D3331",  // Subtle Institutional Dividers
          text: {
            primary: "#FFFFFF",
            secondary: "#A0AAB2",
          }
        },
        // Behavioral Status Signals
        intent: {
          bounce: "#E63946",    // Friction/Loss Red
          hesitate: "#FFB703",  // The "Stall" Amber
          recovered: "#007A33", // Success Green
          analyzing: "#3A86FF", // Processing Blue
        }
      },
      fontFamily: {
        // Inter is the gold standard for data legibility
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'], // For the Raw Telemetry Logs
      },
      boxShadow: {
        // Glow effects for the Node Map and High-Intent Alerts
        'glow-green': '0 0 15px rgba(0, 122, 51, 0.4)',
        'glow-amber': '0 0 15px rgba(255, 183, 3, 0.4)',
        'glow-red': '0 0 15px rgba(230, 57, 70, 0.4)',
      },
      animation: {
        // Pulse animations for the "Friction Map" to draw the eye
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      borderRadius: {
        'fidelity': '4px', // Tight, institutional corners
      }
    },
  },
  plugins: [],
}
