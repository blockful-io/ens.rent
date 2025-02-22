'use client';

import { useCurrency } from '~~/contexts/CurrencyContext';

type Props = {
  size?: 'extraSmall' | 'small' | 'medium';
  className?: string;
};

export const CurrencyToggle = ({ size = 'medium', className = '' }: Props) => {
  const { preferredCurrency, setPreferredCurrency } = useCurrency();

  const sizeClasses = {
    extraSmall: 'h-6 text-xs',
    small: 'h-8 text-sm',
    medium: 'h-10 text-base',
  };

  return (
    <div
      className={`
        relative inline-flex items-center rounded-full bg-gray-100 p-1 w-32 cursor-pointer
        ${sizeClasses[size]} ${className}
      `}
      onClick={() =>
        setPreferredCurrency(preferredCurrency === 'ETH' ? 'USD' : 'ETH')
      }
    >
      <div
        className={`
          absolute transition-all duration-300 flex items-center text-transparent justify-center top-0 bottom-0 m-auto h-8 w-14 rounded-full shadow
          ${preferredCurrency === 'USD' ? 'translate-x-16 bg-blue-500' : 'translate-x-0 bg-white'}
        `}
      >
        {preferredCurrency}
      </div>
      <div className="relative h-8 w-14 flex-1 mr-1 flex items-center justify-center text-gray-900 z-10 text-center">
        ETH
      </div>
      <div
        className={`relative transition-all duration-300 h-8 w-14 flex-1 ml-1 flex items-center justify-center ${preferredCurrency === 'USD' ? 'text-white' : 'text-gray-900'} z-10 text-center`}
      >
        USD
      </div>
    </div>
  );
};
