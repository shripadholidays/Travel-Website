import {
    bgColors, textColors, borderColors, shadowColors, lightCssVars, darkCssVars,
} from './tailwind.dark.js';

// Theme tokens shared by every colour job (shadcn-style, values in index.css)
const SEMANTIC = {
    border: "hsl(var(--border) / <alpha-value>)",
    input: "hsl(var(--input) / <alpha-value>)",
    ring: "hsl(var(--ring) / <alpha-value>)",
    background: "hsl(var(--background) / <alpha-value>)",
    foreground: "hsl(var(--foreground) / <alpha-value>)",
    primary: { DEFAULT: "hsl(var(--primary) / <alpha-value>)", foreground: "hsl(var(--primary-foreground) / <alpha-value>)" },
    secondary: { DEFAULT: "hsl(var(--secondary) / <alpha-value>)", foreground: "hsl(var(--secondary-foreground) / <alpha-value>)" },
    destructive: { DEFAULT: "hsl(var(--destructive) / <alpha-value>)", foreground: "hsl(var(--destructive-foreground) / <alpha-value>)" },
    muted: { DEFAULT: "hsl(var(--muted) / <alpha-value>)", foreground: "hsl(var(--muted-foreground) / <alpha-value>)" },
    accent: { DEFAULT: "hsl(var(--accent) / <alpha-value>)", foreground: "hsl(var(--accent-foreground) / <alpha-value>)" },
    popover: { DEFAULT: "hsl(var(--popover) / <alpha-value>)", foreground: "hsl(var(--popover-foreground) / <alpha-value>)" },
    card: { DEFAULT: "hsl(var(--card) / <alpha-value>)", foreground: "hsl(var(--card-foreground) / <alpha-value>)" },
};
const bg = { ...bgColors, ...SEMANTIC };
const text = { ...textColors, ...SEMANTIC };
const line = { ...borderColors, ...SEMANTIC, DEFAULT: "hsl(var(--border) / <alpha-value>)" };

/** @type {import('tailwindcss').Config} */
export default {
    // Dark mode = <html class="dark">, set by src/lib/theme.ts (and before paint by index.html)
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
    theme: {
        // Each colour job gets its own dark-mode partner — see tailwind.dark.js
        colors: bg,
        backgroundColor: bg,
        gradientColorStops: bg,
        ringOffsetColor: bg,
        textColor: text,
        placeholderColor: text,
        caretColor: text,
        fill: text,
        stroke: text,
        textDecorationColor: text,
        borderColor: line,
        divideColor: line,
        outlineColor: line,
        ringColor: { ...line, DEFAULT: "hsl(var(--ring) / <alpha-value>)" },
        boxShadowColor: { ...shadowColors, ...SEMANTIC },
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                serif: ['Playfair Display', 'serif'],
                display: ['Bebas Neue', 'sans-serif'],
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: 0 },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: 0 },
                },
                "fade-in-up": {
                    "0%": { opacity: 0, transform: "translateY(10px)" },
                    "100%": { opacity: 1, transform: "translateY(0)" },
                },
                "float": {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-10px)" },
                },
                // Fills a progress bar; its duration is set where it's used
                "fill-x": {
                    from: { transform: "scaleX(0)" },
                    to: { transform: "scaleX(1)" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "fade-in-up": "fade-in-up 0.5s ease-out forwards",
                "float": "float 3s ease-in-out infinite",
            },
        }
    },
    plugins: [
        require("tailwindcss-animate"),
        // The colour variables behind every class, light by default and dark under .dark
        function ({ addBase }) {
            addBase({ ':root': lightCssVars, ':root.dark': darkCssVars });
        },
    ],
}
