// jsdom ships no types; the prerender only needs a window with DOMParser
declare module 'jsdom' {
    export class JSDOM {
        constructor(html?: string);
        window: Window & typeof globalThis;
    }
}
