import { createContext, useContext, useState, ReactNode } from 'react';
import { config, type Currency } from '@/config';

interface CurrencyContextType {
    currency: Currency;
    setCurrency: (c: Currency) => void;
    formatPrice: (price: number) => string;
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

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
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
