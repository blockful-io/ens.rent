import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

export enum Currency {
  USD = 'USD',
  ETH = 'ETH',
}

interface CurrencyContextType {
  ethPrice: number;
  preferredCurrency: Currency;
  setPreferredCurrency: (currency: Currency) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [ethPrice, setEthPrice] = useState<number>(0);
  const [preferredCurrency, setPreferredCurrency] = useState<Currency>(
    Currency.USD
  );

  useEffect(() => {
    // Fetch ETH price from an API (e.g., CoinGecko)
    const fetchEthPrice = async () => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
        );
        const data = await response.json();
        setEthPrice(data.ethereum.usd);
      } catch (error) {
        console.error('Failed to fetch ETH price:', error);
      }
    };

    fetchEthPrice();
    // Update price every 5 minutes
    const interval = setInterval(fetchEthPrice, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <CurrencyContext.Provider
      value={{ ethPrice, preferredCurrency, setPreferredCurrency }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

// Custom hook to use the currency context
export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
