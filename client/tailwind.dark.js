/**
 * Dark mode for the whole site, done once here instead of in every component.
 *
 * Every Tailwind colour class (bg-white, text-slate-600, border-red-200, bg-brand-blue …) is
 * pointed at a CSS variable. In light mode the variable holds the normal colour; inside
 * <html class="dark"> it holds a dark-mode partner chosen for its job:
 *
 *   backgrounds  light surfaces turn into dark surfaces, pale tints into deep tints
 *   text         dark ink turns light; text that is already light (used on photos) stays
 *   borders      pale lines turn into subtle dark lines
 *
 * Strong colours (orange buttons, green badges, photo overlays) are left exactly as they are.
 *
 * Translucent white is special: bg-white/90 is a frosted panel and should go dark, while
 * bg-white/10 is glass over a photo and must stay white. Below 50% opacity white stays white.
 * Faint black (hover:bg-black/5) becomes faint white so hovers still show on dark surfaces.
 *
 * Need a colour that never changes? Use `snow` (always white) or `ink` (always near-black).
 */
import twColors from 'tailwindcss/colors.js';

const FAMILIES = ['slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime',
    'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
const NEUTRALS = new Set(['slate', 'gray', 'zinc', 'neutral', 'stone']);
const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

// The dark-mode palettes. Every dark colour on the site comes from one of these.
// ACTIVE picks the one the site uses; the others are kept for comparing.
export const PALETTES = {
    // Neutral soft-black and grey, no blue tint (photos and orange look natural)
    charcoal: {
        canvas: '#121212', surface: '#1C1C1E', recess: '#171717',
        raised: '#2C2C2E', raised2: '#3A3A3C', raised3: '#48484A', raised4: '#636366',
        line1: '#232325', line: '#2C2C2E', line2: '#38383A', line3: '#48484A', line4: '#636366',
        t950: '#FFFFFF', t900: '#F5F5F7', t800: '#E5E5EA', t700: '#D1D1D6', t600: '#AEAEB2', t500: '#98989D', t400: '#7C7C80',
        navy: '#333336', brandLine: '#D1D1D6', deep: '#0A0A0A',
    },
    // Very dark brown-black with a warm tint that sits with the orange
    espresso: {
        canvas: '#14110F', surface: '#1E1A17', recess: '#191512',
        raised: '#2A2420', raised2: '#362F29', raised3: '#463D35', raised4: '#5E534A',
        line1: '#241F1B', line: '#2E2823', line2: '#3A322C', line3: '#4A4038', line4: '#5E534A',
        t950: '#FFFCF8', t900: '#FAF6F1', t800: '#EDE6DE', t700: '#D9CFC4', t600: '#BBAEA2', t500: '#A3958A', t400: '#968879',
        navy: '#3A302A', brandLine: '#D9CFC4', deep: '#0C0A09',
    },
    // First attempt: deep navy-slate (not liked; kept only for reference)
    navy: {
        canvas: '#0B1120', surface: '#121B2E', recess: '#0E1627',
        raised: '#1B2539', raised2: '#25314A', raised3: '#334155', raised4: '#475569',
        line1: '#1A2336', line: '#222D42', line2: '#2A364D', line3: '#34425B', line4: '#475569',
        t950: '#F8FAFC', t900: '#F1F5F9', t800: '#E2E8F0', t700: '#CBD5E1', t600: '#B6C1D1', t500: '#9AA8BC', t400: '#8090A6',
        navy: '#26344F', brandLine: '#CBD5E1', deep: '#020617',
    },
};
export const ACTIVE = process.env.DARK_PALETTE || 'espresso';

const BRAND = { blue: '#0F172A', orange: '#F97316', light: '#F8FAFC', dark: '#020617' };

// ---------- colour helpers ----------
const hexToRgb = (hex) => {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const triplet = (hex) => hexToRgb(hex).join(' ');
const mix = (fg, bg, amount) => {
    const a = hexToRgb(fg), b = hexToRgb(bg);
    return '#' + a.map((v, i) => Math.round(v * amount + b[i] * (1 - amount)).toString(16).padStart(2, '0')).join('');
};

// ---------- dark partners, per job (P = a palette above) ----------
const TINT_BG = { 50: 0.1, 100: 0.16, 200: 0.26, 300: 0.38 };
const TINT_BORDER = { 50: 0.2, 100: 0.24, 200: 0.34, 300: 0.46 };
const TINT_TEXT = { 950: '200', 900: '200', 800: '200', 700: '300', 600: '400' };

function darkFor(P, role, family, shade) {
    const c = twColors[family];
    if (NEUTRALS.has(family)) {
        // 700-950 are the dark bands of light mode (footer, banners): they stay dark, in the palette's own tone
        if (role === 'bg') return { 50: P.recess, 100: P.raised, 200: P.raised2, 300: P.raised3, 400: P.raised4, 700: P.raised2, 800: P.raised, 900: P.deep, 950: P.deep }[shade];
        if (role === 'text') return { 950: P.t950, 900: P.t900, 800: P.t800, 700: P.t700, 600: P.t600, 500: P.t500, 400: P.t400 }[shade];
        if (role === 'border') return { 50: P.line1, 100: P.line, 200: P.line2, 300: P.line3, 400: P.line4, 700: P.line3, 800: P.line2, 900: P.line }[shade];
        return undefined;
    }
    if (role === 'bg' && TINT_BG[shade]) return mix(c['500'], P.surface, TINT_BG[shade]);
    if (role === 'border' && TINT_BORDER[shade]) return mix(c['500'], P.surface, TINT_BORDER[shade]);
    if (role === 'text' && TINT_TEXT[shade]) return c[TINT_TEXT[shade]];
    return undefined;
}

const brandDark = (P, role, k) => ({
    bg: { blue: P.navy, light: P.recess, dark: P.deep },
    text: { blue: P.t900, dark: P.t950, light: P.canvas },
    border: { blue: P.brandLine, light: P.line, dark: P.line3 },
}[role]?.[k]);

// ---------- build: CSS variables + Tailwind colour scales ----------
const lightVars = {};
const darkRecipes = {}; // var name -> (palette) => hex
const withVar = (name, light, darkFn) => {
    lightVars[name] = triplet(light);
    darkRecipes[name] = darkFn;
    return `rgb(var(${name}) / <alpha-value>)`;
};

/** A colour that flips, except when used faintly (glass over photos keeps its colour). */
function alphaAware(name, light, darkFn, { below, fallback }) {
    lightVars[name] = triplet(light);
    darkRecipes[name] = darkFn;
    const literal = triplet(fallback ?? light);
    return ({ opacityValue }) => {
        const a = opacityValue === undefined ? 1 : opacityValue;
        const n = Number(a);
        if (!Number.isNaN(n) && below(n)) return `rgb(${literal} / ${a})`;
        return `rgb(var(${name}) / ${a})`;
    };
}

function scale(role) {
    const out = {};
    for (const family of FAMILIES) {
        out[family] = {};
        for (const shade of SHADES) {
            const light = twColors[family][shade];
            out[family][shade] = darkFor(PALETTES.navy, role, family, shade) !== undefined
                ? withVar(`--c-${role}-${family}-${shade}`, light, (P) => darkFor(P, role, family, shade))
                : light;
        }
    }
    out.brand = {};
    for (const [k, light] of Object.entries(BRAND)) {
        out.brand[k] = brandDark(PALETTES.navy, role, k)
            ? withVar(`--c-${role}-brand-${k}`, light, (P) => brandDark(P, role, k))
            : light;
    }
    // White: bg/border/ring flip to the dark surface, except faint glass (< 50%) over photos
    out.white = role === 'text'
        ? '#ffffff'
        : alphaAware(`--c-${role}-white`, '#ffffff', (P) => P.surface, { below: (n) => n < 0.5 });
    // Black: faint black tints (hover:bg-black/5) become faint white; overlays stay black
    out.black = role === 'bg'
        ? (({ opacityValue }) => {
            const n = Number(opacityValue ?? 1);
            return !Number.isNaN(n) && n <= 0.05
                ? `rgb(var(--c-bg-black-faint) / ${opacityValue})`
                : `rgb(0 0 0 / ${opacityValue ?? 1})`;
        })
        : '#000000';
    out.transparent = 'transparent';
    out.current = 'currentColor';
    out.inherit = 'inherit';
    out.snow = '#ffffff';
    out.ink = '#0F172A';
    return out;
}
lightVars['--c-bg-black-faint'] = '0 0 0';
darkRecipes['--c-bg-black-faint'] = () => '#ffffff';

export const bgColors = scale('bg');
export const textColors = scale('text');
export const borderColors = scale('border');

// Shadows: tinted light-mode shadows become plain black ones on a dark page
export const shadowColors = {
    ...bgColors,
    brand: { ...bgColors.brand, blue: withVar('--c-shadow-brand-blue', BRAND.blue, () => '#000000') },
    slate: { ...bgColors.slate, 200: withVar('--c-shadow-slate-200', twColors.slate['200'], () => '#000000') },
};

// shadcn-style theme tokens (hsl "h s% l%") for the same palette
const hsl = (hex) => {
    const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    let h = 0, sat = 0;
    if (max !== min) {
        const d = max - min;
        sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        h *= 60;
    }
    return `${Math.round(h)} ${Math.round(sat * 100)}% ${Math.round(l * 100)}%`;
};

/** Every dark-mode CSS variable for one palette. */
export function darkVarsFor(name) {
    const P = PALETTES[name];
    const out = {
        colorScheme: 'dark',
        '--background': hsl(P.canvas), '--foreground': hsl(P.t900),
        '--card': hsl(P.surface), '--card-foreground': hsl(P.t900),
        '--popover': hsl(P.surface), '--popover-foreground': hsl(P.t900),
        '--primary': '217 91% 60%', '--primary-foreground': '0 0% 100%',
        '--secondary': hsl(P.raised), '--secondary-foreground': hsl(P.t900),
        '--muted': hsl(P.raised), '--muted-foreground': hsl(P.t500),
        '--accent': hsl(P.raised), '--accent-foreground': hsl(P.t900),
        '--destructive': '0 72% 51%', '--destructive-foreground': '210 40% 98%',
        '--border': hsl(P.line), '--input': hsl(P.line2), '--ring': '25 95% 53%',
    };
    for (const [k, fn] of Object.entries(darkRecipes)) out[k] = triplet(fn(P));
    return out;
}

export const lightCssVars = lightVars;
export const darkCssVars = darkVarsFor(ACTIVE);
