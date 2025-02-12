import { addEnsContracts } from '@ensdomains/ensjs';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'viem';
import { mainnet, sepolia } from 'wagmi/chains';

if (!process.env.NEXT_PUBLIC_RENTAL_CONTRACT_ADDRESS) {
  throw new Error('NEXT_PUBLIC_RENTAL_CONTRACT_ADDRESS is not set');
}

if (!process.env.NEXT_PUBLIC_NAMEWRAPPER_ADDRESS) {
  throw new Error('NEXT_PUBLIC_NAMEWRAPPER_ADDRESS is not set');
}
if (!process.env.NEXT_PUBLIC_RPC_URL) {
  throw new Error('NEXT_PUBLIC_RPC_URL is not set');
}
if (!process.env.NEXT_PUBLIC_MAINNET_RPC_URL) {
  throw new Error('NEXT_PUBLIC_MAINNET_RPC_URL is not set');
}
if (!process.env.NEXT_PUBLIC_ENS_RENT_GRAPHQL_URL) {
  throw new Error('NEXT_PUBLIC_ENS_RENT_GRAPHQL_URL is not set');
}
if (!process.env.NEXT_PUBLIC_ENS_GRAPHQL_URL) {
  throw new Error('NEXT_PUBLIC_ENS_GRAPHQL_URL is not set');
}

export const config = getDefaultConfig({
  appName: 'ens.rent',
  projectId: 'YOUR_PROJECT_ID',
  chains: [
    {
      ...addEnsContracts(mainnet),
      rpcUrls: {
        default: {
          http: [process.env.NEXT_PUBLIC_MAINNET_RPC_URL!],
        },
        public: {
          http: [process.env.NEXT_PUBLIC_MAINNET_RPC_URL!],
        },
      },
      subgraphs: {
        ens: {
          url: process.env.NEXT_PUBLIC_ENS_GRAPHQL_URL,
        },
      },
    },
    {
      ...addEnsContracts(sepolia),
      rpcUrls: {
        default: {
          http: [process.env.NEXT_PUBLIC_RPC_URL!],
        },
        public: {
          http: [process.env.NEXT_PUBLIC_RPC_URL!],
        },
      },
    },
  ],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
    [mainnet.id]: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL),
  },
  ssr: true,
});

export const ensRentAddress = process.env
  .NEXT_PUBLIC_RENTAL_CONTRACT_ADDRESS as `0x${string}`;
export const mainnetEnsRentAddress = process.env
  .NEXT_PUBLIC_MAINNET_RENTAL_CONTRACT_ADDRESS as `0x${string}`;

export function getEnsRentAddress(chainId: number) {
  return chainId === mainnet.id ? mainnetEnsRentAddress : ensRentAddress;
}

export const nameWrapperAddress = process.env
  .NEXT_PUBLIC_NAMEWRAPPER_ADDRESS as `0x${string}`;

export const mainnetNameWrapperAddress = process.env
  .NEXT_PUBLIC_MAINNET_NAMEWRAPPER_ADDRESS as `0x${string}`;

export function getNameWrapperAddress(chainId: number) {
  return chainId === mainnet.id
    ? mainnetNameWrapperAddress
    : nameWrapperAddress;
}

export const ensGraphQL = process.env.NEXT_PUBLIC_ENS_GRAPHQL_URL;
export const mainnetEnsGraphQL =
  process.env.NEXT_PUBLIC_MAINNET_ENS_GRAPHQL_URL;

export function getEnsGraphQL(chainId: number) {
  return chainId === mainnet.id ? mainnetEnsGraphQL : ensGraphQL;
}

export const ensRentGraphQL = process.env.NEXT_PUBLIC_ENS_RENT_GRAPHQL_URL;
export const mainnetEnsRentGraphQL =
  process.env.NEXT_PUBLIC_MAINNET_ENS_RENT_GRAPHQL_URL;

export function getEnsRentGraphQL(chainId: number) {
  return chainId === mainnet.id ? mainnetEnsRentGraphQL : ensRentGraphQL;
}
