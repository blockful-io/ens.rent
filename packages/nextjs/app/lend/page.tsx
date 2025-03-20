'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  createWalletClient,
  custom,
  formatEther,
  labelhash,
  namehash,
  parseEther,
  publicActions,
} from 'viem';
import { useAccount, usePublicClient } from 'wagmi';
import baseRegistrarABI from '~~/abis/baseRegistrar.json';
import ensRentABI from '~~/abis/ensrent.json';
import nameWrapperABI from '~~/abis/nameWrapper.json';
import { Button } from '~~/components/old-dapp/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~~/components/old-dapp/ui/card';
import { Input } from '~~/components/old-dapp/ui/input';
import { Label } from '~~/components/old-dapp/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~~/components/old-dapp/ui/select';
import useDomainsByAddress from '~~/hooks/graphql/useDomains';
import { getEnsRentAddress } from '~~/wagmi';
import { getChainContractAddress } from '@ensdomains/ensjs/contracts';
import { mainnet } from 'viem/chains';
import { EthToUsdValue } from '~~/components/EthToUsdValue';
import { SECONDS_PER_YEAR } from '~~/utils/old-dapp/utils';

function LendPage() {
  const router = useRouter();
  const [domain, setDomain] = useState('');
  const [price, setPrice] = useState<string>();
  const [duration, setDuration] = useState(0);
  const { address } = useAccount();
  const [walletClient, setWalletClient] = useState<any>(null);
  const [checkYourWallet, setCheckYourWallet] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const publicClient = usePublicClient();

  const ensRentAddress = getEnsRentAddress(publicClient?.chain.id || 1);

  const [isListing, setIsListing] = useState(false);
  const [isCheckingApproval, setIsCheckingApproval] = useState(false);

  const pricePerSecond = price
    ? parseEther(price) / BigInt(SECONDS_PER_YEAR)
    : BigInt(0);

  const baseRegistrarAddress = getChainContractAddress({
    blockNumber: BigInt(0),
    client: { chain: publicClient?.chain ?? mainnet },
    contract: 'ensBaseRegistrarImplementation',
  });

  const ensNameWrapperAddress = getChainContractAddress({
    blockNumber: BigInt(0),
    client: { chain: publicClient?.chain ?? mainnet },
    contract: 'ensNameWrapper',
  });

  useEffect(() => {
    if (!publicClient) return;

    if (typeof window !== 'undefined' && address) {
      const client = createWalletClient({
        account: address,
        transport: custom(window.ethereum),
        chain: publicClient.chain,
      }).extend(publicActions);
      setWalletClient(client);
    }
  }, [address, publicClient]);

  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('domain')) {
      setDomain(searchParams.get('domain') as string);
    }
  }, [searchParams]);

  const [names, isLoading, error] = useDomainsByAddress(address!);

  const checkApproval = async (domainToCheck: string) => {
    if (!walletClient) return false;

    setIsCheckingApproval(true);
    try {
      const name = domainToCheck.split('.')[0];
      const tokenId = BigInt(labelhash(name)).toString();

      let owner = (await walletClient.readContract({
        address: baseRegistrarAddress,
        abi: baseRegistrarABI,
        functionName: 'ownerOf',
        args: [tokenId],
      })) as `0x${string}`;

      if (owner !== ensNameWrapperAddress) owner = baseRegistrarAddress;

      const approvedForAll = (await walletClient.readContract({
        address: owner,
        abi: nameWrapperABI,
        functionName: 'isApprovedForAll',
        args: [address, ensRentAddress],
      })) as boolean;

      setIsApproved(approvedForAll);
      return approvedForAll;
    } catch (error) {
      console.error({ error });
      return false;
    } finally {
      setIsCheckingApproval(false);
    }
  };

  useEffect(() => {
    if (domain) checkApproval(domain);
  }, [domain, publicClient?.chain.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const approveDomain = async (domainToApprove: string) => {
    if (!walletClient) return;

    setIsApproving(true);
    try {
      const name = domainToApprove.split('.')[0];
      const tokenId = BigInt(labelhash(name));

      let owner = (await walletClient.readContract({
        address: baseRegistrarAddress,
        abi: baseRegistrarABI,
        functionName: 'ownerOf',
        args: [tokenId],
      })) as `0x${string}`;

      if (owner !== ensNameWrapperAddress) owner = baseRegistrarAddress;

      setCheckYourWallet(true);
      const { request } = await walletClient.simulateContract({
        address: owner,
        abi: nameWrapperABI,
        functionName: 'setApprovalForAll',
        args: [ensRentAddress, true],
        account: address,
      });

      setCheckYourWallet(false);

      await walletClient.waitForTransactionReceipt({
        hash: await walletClient.writeContract(request),
      });

      setIsApproved(true);
    } catch (error) {
      console.error({ error });
    } finally {
      setIsApproving(false);
    }
  };

  const listDomain = async (domainToList: string) => {
    if (!price || !duration || !walletClient) {
      return;
    }

    setIsListing(true);
    try {
      const node = namehash(domainToList);
      const name = domainToList.split('.')[0];
      const tokenId = BigInt(labelhash(name));

      const pricePerSecond = parseEther(price) / BigInt(SECONDS_PER_YEAR);
      const maxEndTimestamp = BigInt(Math.floor(Date.now() / 1000) + duration);

      setCheckYourWallet(true);
      const { request } = await walletClient.simulateContract({
        address: ensRentAddress,
        abi: ensRentABI,
        functionName: 'listDomain',
        args: [tokenId, pricePerSecond, maxEndTimestamp, node, name],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      setCheckYourWallet(false);

      await walletClient.waitForTransactionReceipt({ hash });
      router.push(`/auctions/simple/${domainToList}`);
    } catch (error) {
      console.error({ error });
    } finally {
      setCheckYourWallet(false);
      setIsListing(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!address) {
        toast.error('Please connect your wallet', {
          id: 'wallet-connect-error',
        });
        router.push('/');
        return null;
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [address, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error.message}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/')} variant="outline">
              Return Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="container mx-auto py-8 max-w-4xl">
        <Card className="mx-auto w-full max-w-md bg-white">
          <CardHeader>
            <CardTitle>ENS Domain Rental</CardTitle>
            <CardDescription>Rent an ENS domain</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain Name</Label>
                <Select value={domain} onValueChange={setDomain}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a domain" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {names?.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {domain && (
                  <p className="text-sm text-gray-500 mt-1">
                    {isCheckingApproval ? (
                      <span className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                        Checking approval status...
                      </span>
                    ) : isApproved ? (
                      '✅ This domain is already approved for rental'
                    ) : (
                      '📝 This domain needs approval before it can be listed'
                    )}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="startingPrice">Price per Year (ETH)</Label>
                <Input
                  id="startingPrice"
                  type="text"
                  className="text-black bg-white"
                  value={price}
                  placeholder="0.01"
                  onChange={(e) => {
                    if (
                      !e.target.value ||
                      /^\d*(\.\d{0,18})?$/.test(e.target.value)
                    ) {
                      setPrice(e.target.value);
                    }
                  }}
                />
                {!!price && (
                  <p className="text-sm text-gray-500 mt-1">
                    Price per second:{' '}
                    <EthToUsdValue
                      ethAmount={Number(formatEther(pricePerSecond))}
                    />
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Max rental end date</Label>
                <Input
                  id="endDate"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    const start = new Date().getTime();
                    const end = new Date(e.target.value).getTime();
                    setDuration(Math.floor((end - start) / 1000));
                  }}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Note: It must be before the domain&apos;s expiry date
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch space-y-4">
            {!domain ? (
              <Button disabled={true}>Select a domain</Button>
            ) : isCheckingApproval ? (
              <Button disabled>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Checking approval...
              </Button>
            ) : !isApproved ? (
              <Button
                onClick={async () => {
                  await approveDomain(domain);
                }}
                disabled={!domain || isApproving}
              >
                {isApproving ? 'Approving...' : 'Approve Domain for Rental'}
              </Button>
            ) : (
              <Button
                onClick={async () => await listDomain(domain)}
                disabled={!domain || !price || duration <= 0 || isListing}
              >
                {checkYourWallet
                  ? 'Check your wallet'
                  : isListing
                    ? 'Listing Domain...'
                    : 'List Domain for Rent'}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function Component() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LendPage />
    </Suspense>
  );
}
