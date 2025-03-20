'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Clock, Tag, Wallet } from 'lucide-react';
import { formatEther, labelhash } from 'viem';
import { createWalletClient, custom, publicActions } from 'viem';
import { useAccount, usePublicClient } from 'wagmi';
import ensRentABI from '~~/abis/ensrent.json';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '~~/components/old-dapp/ui/alert';
import { Button } from '~~/components/old-dapp/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~~/components/old-dapp/ui/card';
import useDomainData from '~~/hooks/graphql/useDomainData';
import { useUnlistDomain } from '~~/hooks/graphql/useUnlistDomain';
import { getEnsRentAddress } from '~~/wagmi';
import { EthToUsdValue } from '~~/components/EthToUsdValue';
import { SECONDS_PER_YEAR } from '~~/utils/old-dapp/utils';

export default function DomainBuy() {
  const router = useRouter();
  const params = useParams();
  const { address: connectedAccount } = useAccount();
  const [isSeller, setIsSeller] = useState(false);
  const domain = params?.slug as string;
  const [selectedEndDate, setSelectedEndDate] = useState(new Date());
  const [isRenting, setIsRenting] = useState(false);
  const [isCheckingWallet, setIsCheckingWallet] = useState(false);
  const [isProcessingTx, setIsProcessingTx] = useState(false);
  const [isRented, setIsRented] = useState(false);

  const [listing, isLoading, error] = useDomainData(domain);
  const [duration, setDuration] = useState(
    (new Date(selectedEndDate).getTime() - new Date().getTime()) / 1000 // difference between selected end date and now in seconds
  );

  const { unlistDomain, isUnlisting } = useUnlistDomain();

  const pricePerSecond = BigInt(listing?.price || 0);
  const pricePerYear = pricePerSecond * BigInt(SECONDS_PER_YEAR);
  const totalPrice = pricePerSecond * BigInt(Math.max(0, duration));
  const publicClient = usePublicClient();
  const ensRentAddress = getEnsRentAddress(publicClient?.chain.id || 1);

  useEffect(() => {
    if (listing && connectedAccount) {
      setIsSeller(
        connectedAccount.toLowerCase() === listing.lender.toLowerCase()
      );
    }
  }, [listing, connectedAccount]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = new Date(e.target.value);
    setSelectedEndDate(newEndDate);
    const start = new Date().getTime();
    const end = newEndDate.getTime();
    const newDuration = Math.ceil((end - start) / 1000 + 24 * 60 * 60);
    setDuration(newDuration);
  };

  const handleBuy = async () => {
    if (!listing || !domain || !selectedEndDate || !connectedAccount) return;

    try {
      if (!publicClient) return;

      setIsRenting(true);
      const walletClient = createWalletClient({
        account: connectedAccount,
        transport: custom(window.ethereum),
        chain: publicClient.chain,
      }).extend(publicActions);

      const tokenId = BigInt(labelhash(domain.replace('.eth', '')));
      const desiredEndTimestamp = BigInt(
        Math.floor(new Date(selectedEndDate).getTime() / 1000)
      );

      setIsCheckingWallet(true);

      const { request } = await walletClient.simulateContract({
        address: ensRentAddress,
        abi: ensRentABI,
        functionName: 'rentDomain',
        args: [tokenId, desiredEndTimestamp],
        value: totalPrice,
        chain: publicClient.chain,
        account: connectedAccount,
      });

      const hash = await walletClient.writeContract(request);
      setIsCheckingWallet(false);
      setIsProcessingTx(true);

      await walletClient.waitForTransactionReceipt({ hash });
      setIsRented(true);
    } catch (err) {
      console.error('Error renting domain:', err);
      // Handle error (e.g., show an error message to the user)
    } finally {
      setIsRenting(false);
      setIsCheckingWallet(false);
      setIsProcessingTx(false);
    }
  };

  const handleCloseRental = async () => {
    if (!domain || !connectedAccount) return;

    const success = await unlistDomain(connectedAccount, domain);
    if (success) router.push('/manage');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 "></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100  p-4 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
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

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Listing Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The requested domain listing could not be found.</p>
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

  // Calculate min and max dates safely
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const maxDate = new Date(Number(listing.maxRentalTime) * 1000);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          className="flex items-center gap-2"
          onClick={() => router.push('/browse')}
        >
          <ArrowLeft className="size-4" />
          Back to Browse
        </Button>

        {/* Domain Info */}
        <div className="text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-800">{domain}</h1>
        </div>

        {/* Main info card */}
        <Card className="p-6 bg-white">
          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 ">
                  <div className="flex items-center gap-2">
                    <Tag className="size-5 text-blue-500" />
                    <span className="text-lg font-medium">Price per Year</span>
                  </div>
                  <EthToUsdValue
                    ethAmount={Number(formatEther(pricePerYear))}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 ">
                  <div className="flex items-center gap-2">
                    <Tag className="size-5 text-blue-500" />
                    <span className="text-lg font-medium">
                      Price per Second
                    </span>
                  </div>
                  <EthToUsdValue
                    ethAmount={Number(formatEther(pricePerSecond))}
                  />
                </div>

                {!isSeller && (
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 ">
                    <div className="flex items-center gap-2">
                      <Tag className="size-5 text-blue-500" />
                      <span className="text-lg font-medium">Total Price</span>
                    </div>
                    <EthToUsdValue ethAmount={Number(totalPrice)} />
                  </div>
                )}

                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 ">
                  <div className="flex items-center gap-2">
                    <Clock className="size-5 text-blue-500" />
                    <span className="text-lg font-medium">End Date</span>
                  </div>
                  {isSeller ? (
                    <p>
                      <input
                        type="date"
                        value={maxDate.toISOString().split('T')[0]}
                        className="px-3 py-2 border rounded-md bg-white"
                        disabled
                      />
                    </p>
                  ) : (
                    <input
                      type="date"
                      value={selectedEndDate.toISOString().split('T')[0]}
                      min={minDate}
                      max={maxDate.toISOString().split('T')[0]}
                      onChange={handleDateChange}
                      className="px-3 py-2 border rounded-md bg-white"
                    />
                  )}
                </div>
              </div>

              {!isSeller && (
                <Alert className="bg-blue-50 text-blue-700">
                  <AlertCircle className="size-4" />
                  <AlertTitle>First Come, First Served</AlertTitle>
                  <AlertDescription>
                    This domain is available for immediate rental. The first
                    person to complete the transaction will receive the domain.
                  </AlertDescription>
                </Alert>
              )}

              {!isSeller ? (
                isRented ? (
                  <div className="flex flex-col gap-2">
                    <Alert className="bg-green-50 text-green-700 flex justify-between items-center">
                      <div>
                        <AlertTitle>Success!</AlertTitle>
                        <AlertDescription>
                          The domain is now yours until{' '}
                          {new Date(selectedEndDate).toLocaleDateString()}
                        </AlertDescription>
                      </div>
                      <div>
                        <Button asChild>
                          <Link
                            target="_blank"
                            href={`https://app.ens.domains/${domain}`}
                          >
                            Manage your rented domain
                          </Link>
                        </Button>
                      </div>
                    </Alert>
                  </div>
                ) : (
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleBuy}
                    disabled={
                      selectedEndDate < new Date(Date.now()) ||
                      isRenting ||
                      !connectedAccount
                    }
                  >
                    {isCheckingWallet ? (
                      <span className="flex items-center gap-2">
                        <Wallet className="size-4" />
                        Check your wallet...
                      </span>
                    ) : isProcessingTx ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Processing transaction...
                      </span>
                    ) : (
                      <>
                        Rent Now for{' '}
                        <EthToUsdValue
                          ethAmount={Number(formatEther(totalPrice))}
                        />
                      </>
                    )}
                  </Button>
                )
              ) : (
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleCloseRental}
                  disabled={isUnlisting}
                >
                  {isUnlisting ? 'Unlisting...' : 'Unlist Domain'}
                </Button>
              )}

              {!isSeller && (
                <div className="rounded-lg border p-4">
                  <h2 className="mb-2 text-sm font-medium text-gray-500">
                    Listed by
                  </h2>
                  <p className="font-medium">{listing.lender}</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Terms */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Rental Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              • Rental period starts immediately upon successful transaction
            </p>
            <p>• Price is fixed and non-negotiable</p>
            <p>• Payment is required in ETH</p>
            <p>• Domain transfer will be executed automatically</p>
            {selectedEndDate && (
              <p>
                • Rental ends on:{' '}
                {new Date(selectedEndDate).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
