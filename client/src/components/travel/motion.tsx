import { useEffect, useRef, useState, type RefObject } from 'react';
import anime from 'animejs';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Plane } from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';
import { prefersReducedMotion } from '@/lib/travel';

gsap.registerPlugin(useGSAP);

/** GSAP stagger for result cards (`.travel-card`) whenever the result set changes. */
export function useStaggerIn(scope: RefObject<HTMLElement | null>, deps: unknown[]) {
    useGSAP(() => {
        if (prefersReducedMotion()) return;
        gsap.from('.travel-card', {
            y: 24,
            autoAlpha: 0,
            duration: 0.5,
            stagger: 0.06,
            ease: 'power2.out',
            clearProps: 'all',
        });
    }, { scope, dependencies: deps });
}

/** GSAP entrance for a search card overlapping the hero. */
export function useRiseIn(scope: RefObject<HTMLElement | null>) {
    useGSAP(() => {
        if (prefersReducedMotion() || !scope.current) return;
        gsap.from(scope.current, { y: 40, autoAlpha: 0, duration: 0.7, ease: 'power3.out', delay: 0.2, clearProps: 'all' });
    }, { scope });
}

/** anime.js: a plane flying along a dashed route while results load. */
export const PlaneLoader = ({ label }: { label: string }) => {
    const pathRef = useRef<SVGPathElement>(null);
    const planeRef = useRef<SVGGElement>(null);

    useEffect(() => {
        if (prefersReducedMotion() || !pathRef.current || !planeRef.current) return;
        const path = anime.path(pathRef.current);
        const animation = anime({
            targets: planeRef.current,
            translateX: path('x'),
            translateY: path('y'),
            rotate: path('angle'),
            easing: 'easeInOutSine',
            duration: 2400,
            loop: true,
        });
        return () => animation.pause();
    }, []);

    return (
        <div role="status" aria-live="polite" className="flex flex-col items-center justify-center py-16 text-center">
            <svg viewBox="0 0 320 120" className="w-72 max-w-full h-28" aria-hidden="true">
                <path ref={pathRef} d="M10 100 C 90 10, 230 10, 310 100" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="6 8" />
                <circle cx="10" cy="100" r="5" fill="#F97316" />
                <circle cx="310" cy="100" r="5" fill="#0F172A" />
                <g ref={planeRef}>
                    <g transform="translate(-12 -12)">
                        <Plane width={24} height={24} color="#F97316" strokeWidth={2.2} />
                    </g>
                </g>
            </svg>
            <p className="mt-4 font-bold text-brand-blue">{label}</p>
        </div>
    );
};

/** anime.js count-up for prices; renders through the site currency switcher. */
export const AnimatedPrice = ({ value, className }: { value: number; className?: string }) => {
    const { formatPrice } = useCurrency();
    const [display, setDisplay] = useState(value);
    const previous = useRef(value);

    useEffect(() => {
        if (prefersReducedMotion() || previous.current === value) {
            setDisplay(value);
            previous.current = value;
            return;
        }
        const counter = { v: previous.current };
        const animation = anime({
            targets: counter,
            v: value,
            duration: 700,
            easing: 'easeOutCubic',
            update: () => setDisplay(counter.v),
        });
        previous.current = value;
        return () => animation.pause();
    }, [value]);

    return <span className={className}>{formatPrice(display)}</span>;
};

/** anime.js spin for the swap (⇄) button. */
export function spin(el: Element | null) {
    if (!el || prefersReducedMotion()) return;
    anime({ targets: el, rotate: '+=180', duration: 450, easing: 'easeOutBack' });
}
