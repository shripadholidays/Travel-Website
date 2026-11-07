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
import twColors from 'tailwindcss/colors';

const FAMILIES = ['slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime',
    'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
const NEUTRALS = new Set(['slate', 'gray', 'zinc', 'neutral', 'stone']);
const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

// The dark-mode surfaces (navy-slate, matching the brand's #020617)
export const DARK = {
    canvas: '#0B1120',   // page background
    surface: '#121B2E',  // cards, panels, the old "white"
    recess: '#0E1627',   // slightly sunken areas (old slate-50)
    raised: '#1B2539',   // chips, hovers (old slate-100)
    raised2: '#25314A',  // stronger fills (old slate-200)
    line: '#222D42',     // borders (old slate-100/200)
    line2: '#34425B',    // stronger borders (old slate-300)
    ink: '#F1F5F9',      // headings
    navy: '#26344F',     // the old navy buttons / bands, lifted so they show on a dark page
};

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

// ---------- dark partners, per job ----------
const NEUTRAL_BG = { 50: DARK.recess, 100: DARK.raised, 200: DARK.raised2, 300: '#334155', 400: '#475569' };
const NEUTRAL_TEXT = { 950: '#F8FAFC', 900: DARK.ink, 800: '#E2E8F0', 700: '#CBD5E1', 600: '#B6C1D1', 500: '#9AA8BC', 400: '#8090A6' };
const NEUTRAL_BORDER = { 50: '#1A2336', 100: DARK.line, 200: '#2A364D', 300: DARK.line2, 400: '#475569' };
const TINT_BG = { 50: 0.1, 100: 0.16, 200: 0.26, 300: 0.38 };
const TINT_BORDER = { 50: 0.2, 100: 0.24, 200: 0.34, 300: 0.46 };
const TINT_TEXT = { 950: '200', 900: '200', 800: '200', 700: '300', 600: '400' };

function darkFor(role, family, shade) {
    const c = twColors[family];
    if (NEUTRALS.has(family)) {
        if (role === 'bg') return NEUTRAL_BG[shade];
        if (role === 'text') return NEUTRAL_TEXT[shade];
        if (role === 'border') return NEUTRAL_BORDER[shade];
        return undefined;
    }
    if (role === 'bg' && TINT_BG[shade]) return mix(c['500'], DARK.surface, TINT_BG[shade]);
    if (role === 'border' && TINT_BORDER[shade]) return mix(c['500'], DARK.surface, TINT_BORDER[shade]);
    if (role === 'text' && TINT_TEXT[shade]) return c[TINT_TEXT[shade]];
    return undefined;
}

const BRAND_DARK = {
    bg: { blue: DARK.navy, light: DARK.recess },
    text: { blue: DARK.ink, dark: '#F8FAFC', light: DARK.canvas },
    border: { blue: '#CBD5E1', light: DARK.line, dark: DARK.line2 },
};

// ---------- build: CSS variables + Tailwind colour scales ----------
const lightVars = {};
const darkVars = {};
const withVar = (name, light, dark) => {
    lightVars[name] = triplet(light);
    darkVars[name] = triplet(dark);
    return `rgb(var(${name}) / <alpha-value>)`;
};

/** A colour that flips, except when used faintly (glass over photos keeps its colour). */
function alphaAware(name, light, dark, { below, fallback }) {
    lightVars[name] = triplet(light);
    darkVars[name] = triplet(dark);
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
            const dark = darkFor(role, family, shade);
            out[family][shade] = dark ? withVar(`--c-${role}-${family}-${shade}`, light, dark) : light;
        }
    }
    out.brand = {};
    for (const [k, light] of Object.entries(BRAND)) {
        const dark = BRAND_DARK[role]?.[k];
        out.brand[k] = dark ? withVar(`--c-${role}-brand-${k}`, light, dark) : light;
    }
    // White: bg/border/ring flip to the dark surface, except faint glass (< 50%) over photos
    out.white = role === 'text'
        ? '#ffffff'
        : alphaAware(`--c-${role}-white`, '#ffffff', DARK.surface, { below: (n) => n < 0.5 });
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
darkVars['--c-bg-black-faint'] = '255 255 255';

export const bgColors = scale('bg');
export const textColors = scale('text');
export const borderColors = scale('border');

// Shadows: tinted light-mode shadows become plain black ones on a dark page
export const shadowColors = {
    ...bgColors,
    brand: { ...bgColors.brand, blue: withVar('--c-shadow-brand-blue', BRAND.blue, '#000000') },
    slate: { ...bgColors.slate, 200: withVar('--c-shadow-slate-200', twColors.slate['200'], '#000000') },
};

export const lightCssVars = lightVars;
export const darkCssVars = darkVars;
