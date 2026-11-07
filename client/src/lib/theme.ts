import { useSyncExternalStore } from 'react';

/**
 * Light / dark / match-the-device. The choice lives in localStorage; <html class="dark"> does the
 * rest (see tailwind.dark.js). index.html runs the same check before first paint, so a dark-mode
 * visitor never sees a white flash — keep STORAGE_KEY in step with the script there.
 */
export type ThemeChoice = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const STORAGE_KEY = 'wz-theme';
const META_COLORS: Record<ResolvedTheme, string> = { light: '#F97316', dark: '#0B1120' };

const listeners = new Set<() => void>();
const media = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

function readChoice(): ThemeChoice {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        if (v === 'light' || v === 'dark' || v === 'system') return v;
    } catch { /* private mode, blocked storage */ }
    return 'system';
}

let choice: ThemeChoice = typeof window !== 'undefined' ? readChoice() : 'system';

export function resolve(c: ThemeChoice): ResolvedTheme {
    if (c === 'system') return media?.matches ? 'dark' : 'light';
    return c;
}

function apply(animate: boolean) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const resolved = resolve(choice);
    if (animate) {
        root.classList.add('theme-transition');
        window.setTimeout(() => root.classList.remove('theme-transition'), 300);
    }
    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLORS[resolved]);
}

function emit() {
    listeners.forEach((l) => l());
}

export function setTheme(next: ThemeChoice) {
    choice = next;
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    apply(true);
    emit();
}

// Follow the device while on "system"; follow other tabs that change the setting
media?.addEventListener?.('change', () => {
    if (choice === 'system') { apply(true); emit(); }
});
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (e.key !== STORAGE_KEY) return;
        choice = readChoice();
        apply(true);
        emit();
    });
    apply(false);
}

function subscribe(l: () => void) {
    listeners.add(l);
    return () => { listeners.delete(l); };
}

const snapshot = () => `${choice}:${resolve(choice)}`;

export function useTheme() {
    const snap = useSyncExternalStore(subscribe, snapshot, () => 'system:light');
    const [c, r] = snap.split(':') as [ThemeChoice, ResolvedTheme];
    return { theme: c, resolvedTheme: r, setTheme };
}
