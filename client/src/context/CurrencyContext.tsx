import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { config, type Currency } from '@/config';
import { usePublicSettings } from '@/hooks/use-settings';

interface CurrencyContextType {
    /** The currency the traveller picked: prices are shown and charged in it */
    currency: Currency;
    setCurrency: (c: Currency) => void;
    /** Currencies travellers can pick (switched on in Admin → Settings) */
    currencies: Currency[];
    /** The site's base currency (revenue reports, default for new tours) */
    base: Currency;
    /** Units of each currency per 1 USD, from the server */
    rates: Record<Currency, number>;
    convert: (amount: number, from?: string, to?: string) => number;
    /** An amount priced in `from` (default USD), shown in the traveller's currency */
    formatPrice: (amount: number, from?: string) => string;
    /** An exact amount in a given currency, e.g. what a booking was charged */
    formatMoney: (amount: number, currency?: string) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const STORAGE_KEY = 'wandeazy.currency';
const SYMBOLS: Record<string, Currency> = { '$': 'USD', '₹': 'INR', '€': 'EUR', '£': 'GBP' };
const code = (c?: string): string => (c ? SYMBOLS[c] ?? c.toUpperCase() : 'USD');

function readStored(): Currency | null {
    try {
        return (localStorage.getItem(STORAGE_KEY) as Currency | null) ?? null;
    } catch {
        return null;
    }
}

export function makeFormatter(currency: string, decimals = 0) {
    const locale = currency === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
    const { data } = usePublicSettings();
    const server = data?.settings?.currency;
    const rates = (server?.rates ?? config.currency.rates) as Record<Currency, number>;
    const base = (server?.base ?? config.currency.default) as Currency;
    const currencies = (server?.enabled ?? Object.keys(config.currency.rates)) as Currency[];

    const [chosen, setChosen] = useState<Currency | null>(readStored);
    // A saved choice that has since been switched off falls back to the base currency
    const currency: Currency = chosen && currencies.includes(chosen) ? chosen : base;

    const setCurrency = (c: Currency) => {
        setChosen(c);
        try { localStorage.setItem(STORAGE_KEY, c); } catch { /* private mode: keep it for this visit only */ }
    };

    useEffect(() => { document.documentElement.dataset.currency = currency; }, [currency]);

    const value = useMemo<CurrencyContextType>(() => {
        const convert = (amount: number, from = 'USD', to: string = currency) => {
            const f = code(from), t = code(to);
            if (f === t) return amount;
            return (amount / (rates[f as Currency] || 1)) * (rates[t as Currency] || 1);
        };
        return {
            currency, setCurrency, currencies, base, rates, convert,
            formatPrice: (amount, from = 'USD') => makeFormatter(currency).format(convert(amount || 0, from, currency)),
            formatMoney: (amount, c = 'USD') => {
                try { return makeFormatter(code(c), 2).format(amount || 0); } catch { return `${c} ${amount}`; }
            },
        };
    }, [currency, currencies, base, rates]); // eslint-disable-line react-hooks/exhaustive-deps

    return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};

export type { Currency };
