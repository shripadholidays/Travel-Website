import { createContext, useContext, useState, ReactNode } from 'react';
import { config, type Currency } from '@/config';

interface CurrencyContextType {
    currency: Currency;
    setCurrency: (c: Currency) => void;
    formatPrice: (price: number) => string;
    /** The exact amount in US dollars — what cards are actually charged */
    formatUSD: (price: number) => string;
    /** True when prices on screen are converted estimates rather than the charged currency */
    isConverted: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
    const [currency, setCurrency] = useState<Currency>(config.currency.default);

    const formatPrice = (priceInUSD: number) => {
        const converted = priceInUSD * config.currency.rates[currency];
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(converted);
    };

    const formatUSD = (priceInUSD: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(priceInUSD);

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, formatUSD, isConverted: currency !== 'USD' }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};

export type { Currency };
