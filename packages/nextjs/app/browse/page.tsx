'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Search, TrendingDown } from 'lucide-react';
import { formatEther } from 'viem';
import { useAccount, useChainId, useEnsName } from 'wagmi';
import { Button } from '~~/components/old-dapp/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~~/components/old-dapp/ui/card';
import { Input } from '~~/components/old-dapp/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~~/components/old-dapp/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~~/components/old-dapp/ui/table';
import useAvailableDomains from '~~/hooks/graphql/useAvailableDomains';
import useRentedDomains, {
  RentedDomainType,
} from '~~/hooks/graphql/useRentedDomains';
import { Domain } from '~~/types/types';
import { EnsDappLink } from '~~/components/EnsDappLink';

export default function Component() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchRented, setSearchRented] = useState('');
  const [sortBy, setSortBy] = useState('price');
  const [orderRented, setOrderRented] = useState('time');
  const router = useRouter();
  const { address } = useAccount();

  const [availableDomains, setAvailableDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [rentedDomains, setRentedDomains] = useState<RentedDomainType[]>([]);
  const [isLoadingRented, setIsLoadingRented] = useState(false);
  const [errorRented, setErrorRented] = useState<Error | null>(null);

  const chainId = useChainId();

  const [
    getInitialPage,
    getNextPage,
    getPreviousPage,
    hasNextPage,
    hasPreviousPage,
  ] = useAvailableDomains(address);

  const [
    getInitialRentedPage,
    getNextRentedPage,
    getPreviousRentedPage,
    hasNextPageRented,
    hasPreviousPageRented,
  ] = useRentedDomains(address);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        const domains = await getInitialPage(searchTerm, sortBy);
        setAvailableDomains(domains);
      } catch (err) {
        console.log('err', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [searchTerm, sortBy, chainId]);

  useEffect(() => {
    const loadInitialRentedData = async () => {
      try {
        setIsLoadingRented(true);
        const domains = await getInitialRentedPage(searchRented, orderRented);
        setRentedDomains(domains);
      } catch (err) {
        console.log('err', err);
        setErrorRented(err as Error);
      } finally {
        setIsLoadingRented(false);
      }
    };

    loadInitialRentedData();
  }, [searchRented, orderRented, chainId]);

  const handleNextPage = async () => {
    try {
      setIsLoading(true);
      const domains = await getNextPage(searchTerm, sortBy);
      setAvailableDomains(domains);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousPage = async () => {
    try {
      setIsLoading(true);
      const domains = await getPreviousPage(searchTerm, sortBy);
      setAvailableDomains(domains);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextRentedPage = async () => {
    try {
      setIsLoadingRented(true);
      const domains = await getNextRentedPage(searchRented, orderRented);
      setRentedDomains(domains);
    } catch (err) {
      setErrorRented(err as Error);
    } finally {
      setIsLoadingRented(false);
    }
  };

  const handlePreviousRentedPage = async () => {
    try {
      setIsLoadingRented(true);
      const domains = await getPreviousRentedPage(searchRented, orderRented);
      setRentedDomains(domains);
    } catch (err) {
      setErrorRented(err as Error);
    } finally {
      setIsLoadingRented(false);
    }
  };

  const filteredDomains = availableDomains;
  const rentedFilteredDomains = rentedDomains;

  const TableView = () => (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-white text-black">
              <TableHead>Domain Name</TableHead>
              <TableHead>Price per year</TableHead>
              <TableHead>Maximum Rental Time</TableHead>
              <TableHead>Lender</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDomains.map((domain) => (
              <TableRow key={domain.id}>
                <TableCell className="font-medium">
                  <EnsDappLink name={domain.name} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <TrendingDown className="w-4 h-4 text-green-500 mr-2" />
                    {domain.price} ETH
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 text-blue-500 mr-2" />
                    {new Date(
                      Number(domain.maxRentalTime) * 1000
                    ).toLocaleDateString('en-GB')}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <EnsDappLink address={domain.lender} name={domain.name} />
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    onClick={() =>
                      router.push(`/auctions/simple/${domain.name}`)
                    }
                  >
                    Rent Now
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end gap-4 mt-4">
        <Button
          variant="outline"
          onClick={handlePreviousPage}
          disabled={isLoading || !hasPreviousPage}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          onClick={handleNextPage}
          disabled={isLoading || !hasNextPage}
        >
          Next
        </Button>
      </div>
    </div>
  );

  const RentedTableView = () => {
    return (
      <>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-white text-black">
                <TableHead>Domain Name</TableHead>
                <TableHead>Price per year</TableHead>
                <TableHead>Rental Start</TableHead>
                <TableHead>Rental End</TableHead>
                <TableHead>Borrower</TableHead>
                <TableHead>Lender</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rentedFilteredDomains.map((domain: RentedDomainType) => {
                if (!domain) {
                  return;
                }
                return (
                  <TableRow
                    key={
                      domain.listing.price +
                      domain.listing.name +
                      domain.startTime
                    }
                    className={'bg-gray-100 hover:bg-gray-100'}
                  >
                    <TableCell className="font-medium">
                      <EnsDappLink name={domain?.listing?.name} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <TrendingDown className="w-4 h-4 text-green-500 mr-2" />
                        {formatEther(
                          BigInt(domain?.listing?.price || 0) *
                            BigInt(365 * 24 * 60 * 60)
                        )}
                        ETH
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-blue-500 mr-2" />
                        {new Date(
                          Number(domain?.startTime || 0) * 1000
                        ).toLocaleDateString('en-GB')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-blue-500 mr-2" />
                        {new Date(
                          Number(domain.endTime) * 1000
                        ).toLocaleDateString('en-GB')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <EnsDappLink address={domain.borrower} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <EnsDappLink address={domain?.listing?.lender} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        disabled
                        onClick={() =>
                          router.push(`/auctions/simple/${domain.listing.name}`)
                        }
                      >
                        Already Rented
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end gap-4 mt-4">
          <Button
            variant="outline"
            onClick={handlePreviousRentedPage}
            disabled={isLoadingRented || !hasPreviousPageRented}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={handleNextRentedPage}
            disabled={isLoadingRented || !hasNextPageRented}
          >
            Next
          </Button>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="container mx-auto py-8 flex flex-col gap-4">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Available ENS Domains</CardTitle>
            <CardDescription>
              Browse and rent available ENS domains - Show all domains available
              for rent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-grow">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search domains..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price">Price: Low to High</SelectItem>
                    <SelectItem value="time">Time Left: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <p>Loading available domains...</p>
              ) : error ? (
                <p>Error: {error.message}</p>
              ) : (
                <TableView />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Latest Rented ENS Domains</CardTitle>
            <CardDescription>
              Browse and check what you missed out on - FOMO guaranteed! 🔥
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-grow">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search domains..."
                    value={searchRented}
                    onChange={(e) => setSearchRented(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={orderRented} onValueChange={setOrderRented}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price">Highest Price</SelectItem>
                    <SelectItem value="time">Recently Rented</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoadingRented ? (
                <p>Loading available domains...</p>
              ) : errorRented ? (
                <p>Error: {errorRented.message}</p>
              ) : (
                <RentedTableView />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
