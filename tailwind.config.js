const animate = require("tailwindcss-animate");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx,vue}", "./components/**/*.{ts,tsx,vue}", "./app/**/*.{ts,tsx,vue}", "./src/**/*.{ts,tsx,vue}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        border: "#292524", input: "#292524", ring: "#BF0D54", background: "#0C0A09", foreground: "#FAFAF9",
        primary: { DEFAULT: "#BF0D54", foreground: "#FAFAF9" },
        secondary: { DEFAULT: "#D247BF", foreground: "#FAFAF9" },
        muted: { DEFAULT: "#292524", foreground: "#A8A29E" },
        accent: { DEFAULT: "#972C89", foreground: "#FAFAF9" },
        popover: { DEFAULT: "#161412", foreground: "#FAFAF9" },
        card: { DEFAULT: "#161412", foreground: "#FAFAF9" },
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(90deg, #D247BF, #BF0D54)",
        "dot-pattern": "radial-gradient(rgba(191, 13, 84, 0.12) 1px, transparent 1px)",
      },
      backgroundSize: { dots: "32px 32px" },
      boxShadow: { brand: "0 4px 14px rgba(191, 13, 84, 0.3)", glow: "0 0 48px rgba(191, 13, 84, 0.2)" },
      keyframes: {
        float: { "0%, 100%": { transform: "translate3d(0, 0, 0)" }, "50%": { transform: "translate3d(0, -12px, 0)" } },
        "accordion-down": { from: { height: 0 }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: 0 } },
        "combo-glow": { "0%, 100%": { boxShadow: "0 0 20px rgba(251,191,36,.5),0 0 40px rgba(251,191,36,.2)" }, "50%": { boxShadow: "0 0 30px rgba(251,191,36,.8),0 0 60px rgba(251,191,36,.4)" } },
      },
      animation: { float: "float 8s cubic-bezier(.45, 0, .55, 1) infinite", "accordion-down": "accordion-down .2s ease-out", "accordion-up": "accordion-up .2s ease-out", "combo-glow": "combo-glow .8s ease-out" },
    },
  },
  plugins: [animate],
};
