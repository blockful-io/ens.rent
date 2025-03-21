'use client';

import { useEffect, useState } from 'react';
import { SiteHeader } from './old-dapp/navbar';
import {
  RainbowKitProvider,
  darkTheme,
  lightTheme,
} from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppProgressBar as ProgressBar } from 'next-nprogress-bar';
import { useTheme } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { WagmiProvider } from 'wagmi';
import { BlockieAvatar } from '~~/components/scaffold-eth';
import { useInitializeNativeCurrencyPrice } from '~~/hooks/scaffold-eth';
import { config } from '~~/wagmi';
import { CurrencyProvider } from '~~/contexts/CurrencyContext';

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  useInitializeNativeCurrencyPrice();

  return (
    <>
      <div className={`flex flex-col min-h-screen `}>
        <SiteHeader />
        <main className="relative flex flex-col flex-1">{children}</main>
      </div>
      <Toaster />
    </>
  );
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export const ScaffoldEthAppWithProviders = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ProgressBar height="3px" color="#2299dd" />
        <CurrencyProvider>
          <RainbowKitProvider avatar={BlockieAvatar} theme={lightTheme()}>
            <ScaffoldEthApp>{children}</ScaffoldEthApp>
          </RainbowKitProvider>
        </CurrencyProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
