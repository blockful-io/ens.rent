'use client';

import { useCurrency } from '~~/contexts/CurrencyContext';

interface EthToUsdValueProps {
  ethAmount?: number;
}

export const EthToUsdValue = ({ ethAmount }: EthToUsdValueProps) => {
  const { ethPrice, preferredCurrency } = useCurrency();

  if (!ethAmount) {
    return <span>-</span>;
  }

  const usdValue = ethAmount * ethPrice;

  return (
    <div className="flex items-center gap-1">
      {preferredCurrency === 'ETH' ? (
        <span>{Number(ethAmount).toFixed(7)} ETH</span>
      ) : (
        <span>{usdValue.toFixed(7)} USD</span>
      )}
    </div>
  );
};
