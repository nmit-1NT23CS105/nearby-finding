import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1440px"
      }
    },
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))"
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.4s ease-out"
      },
      boxShadow: {
        soft: "0 8px 30px rgba(0, 0, 0, 0.08)",
        focus: "0 0 0 3px rgba(14, 116, 144, 0.35)"
      },
      backgroundImage: {
        "hero-light": "radial-gradient(circle at 15% 20%, rgba(56, 189, 248, 0.25), transparent 40%), radial-gradient(circle at 90% 10%, rgba(59, 130, 246, 0.18), transparent 32%), linear-gradient(135deg, #f8fafc, #eef2ff 45%, #ecfeff)",
        "hero-dark": "radial-gradient(circle at 20% 10%, rgba(56, 189, 248, 0.22), transparent 45%), radial-gradient(circle at 85% 15%, rgba(14, 116, 144, 0.35), transparent 30%), linear-gradient(135deg, #020617, #0b1220 42%, #071a21)"
      }
    }
  },
  plugins: [
    require("tailwindcss-animate")
  ]
};

export default config;
