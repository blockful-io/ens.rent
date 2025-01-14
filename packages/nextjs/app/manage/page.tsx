"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Tag, Timer } from "lucide-react";
import toast from "react-hot-toast";
import { formatEther, labelhash, namehash } from "viem";
import { useAccount, useEnsName, usePublicClient } from "wagmi";
import { Button } from "~~/components/old-dapp/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~~/components/old-dapp/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~~/components/old-dapp/ui/dialog";
import { Input } from "~~/components/old-dapp/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~~/components/old-dapp/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~~/components/old-dapp/ui/table";
import useDomainsByAddress from "~~/hooks/graphql/useDomains";
import useListings from "~~/hooks/graphql/useListings";
import { useUnlistDomain } from "~~/hooks/graphql/useUnlistDomain";
import { Domain, RentalStatus } from "~~/types/types";
import { getStatusColor } from "~~/utils/old-dapp/utils";

export default function RegisteredDomains() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [filteredStatus, setFilteredStatus] = useState<RentalStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [unlistDomain, setUnlistDomain] = useState<Pick<Domain, "id" | "name"> | null>(null);
  const router = useRouter();
  const { address } = useAccount();
  const [listings, rentalIns, rentalOuts, isLoadingListings] = useListings({
    lender: address || "",
  });

  const [availableNames, isLoadingAvailables, error] = useDomainsByAddress(address);
  const [filteredDomains, setFilteredDomains] = useState<Domain[]>([]);

  const { unlistDomain: unlistDomainFn, isUnlisting } = useUnlistDomain();

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!address) {
        toast.error("Please connect your wallet", {
          id: "wallet-connect-error",
        });
        router.push("/");
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [address, router]);

  useEffect(() => {
    async function getDomains() {
      setIsLoading(true);

      const filteredDomains: Domain[] = [
        ...availableNames.map(
          (name: string, i: number): Domain => ({
            id: i.toString(),
            name,
            status: RentalStatus.available,
            lender: address!,
            createdAt: "",
            node: namehash(name),
            tokenId: Number(labelhash(name.replace(".eth", ""))).toString(),
          }),
        ),
        ...listings,
        ...rentalIns,
        ...rentalOuts,
      ].filter(
        domain =>
          domain.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          (filteredStatus === "all" || domain.status === filteredStatus),
      );

      setFilteredDomains(sortDomains(filteredDomains, sortBy));
      setIsLoading(false);
    }

    getDomains();
  }, [availableNames, filteredStatus, listings, rentalIns, rentalOuts, searchTerm, sortBy]);

  useEffect(() => {
    setFilteredDomains(prevDomains => sortDomains(prevDomains, sortBy));
  }, [sortBy]);

  const handleUnlist = async () => {
    if (!unlistDomain || !address) return;

    setIsLoading(true);
    const success = await unlistDomainFn(address, unlistDomain.name);
    if (success) {
      setUnlistDomain(null);
      router.refresh();
    }
    setIsLoading(false);
  };

  function BorrowerCell({ borrower }: { borrower: string }) {
    const client = usePublicClient();

    const { data: ensName, isLoading: isLoadingEns } = useEnsName({
      address: borrower as `0x${string}`,
      chainId: client?.chain.id,
    });

    if (isLoadingEns) {
      return <span className="animate-pulse">Loading...</span>;
    }

    return (
      <span>
        {(ensName && (
          <Link target="_blank" className="text-blue-500 hover:underline" href={`https://app.ens.domains/${borrower}`}>
            {ensName.toString()}
          </Link>
        )) ||
          borrower ||
          "-"}
      </span>
    );
  }

  if (isLoadingAvailables || isLoadingListings || isLoading || isUnlisting) {
    return (
      <div className="min-h-screen  dark:bg-gray-900 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error.message}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push("/")} variant="outline">
              Return Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="container mx-auto py-8 ">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>My Registered Domains</CardTitle>
            <CardDescription>
              Manage your registered ENS domains and their rental status - Show lend domains and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-grow">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search domains..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="expiry">Expiry Date</SelectItem>
                    <SelectItem value="price">Rental Price</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filteredStatus}
                  onValueChange={(value: string) => setFilteredStatus(value as RentalStatus | "all")}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue>
                      {filteredStatus === "all" ? (
                        "All Status"
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                            filteredStatus,
                          )}`}
                        >
                          {filteredStatus.charAt(0).toUpperCase() + filteredStatus.slice(1)}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="available">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                          RentalStatus.available,
                        )}`}
                      >
                        Available
                      </span>
                    </SelectItem>
                    <SelectItem value="rented out">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                          RentalStatus.rentedOut,
                        )}`}
                      >
                        Rented out
                      </span>
                    </SelectItem>
                    <SelectItem value="rented in">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                          RentalStatus.rentedIn,
                        )}`}
                      >
                        Rented in
                      </span>
                    </SelectItem>
                    <SelectItem value="listed">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                          RentalStatus.listed,
                        )}`}
                      >
                        Listed
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Domains Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain Name</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Current Renter</TableHead>
                      <TableHead>Rental Price</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDomains.map((domain, index) => {
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{domain.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Timer className="h-4 w-4 text-gray-500" />
                              {domain.maxRentalTime ? (
                                <div className="flex flex-col">
                                  <span>{new Date(parseInt(domain.maxRentalTime) * 1000).toLocaleDateString()}</span>
                                  <span className="text-xs text-gray-500">
                                    ({getTimeUntilExpiry(domain.maxRentalTime)} days left)
                                  </span>
                                </div>
                              ) : (
                                <span>N/A</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                                domain.status,
                              )}`}
                            >
                              {domain.status.charAt(0).toUpperCase() + domain.status.slice(1)}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {domain.rentals?.items?.length ? (
                              <BorrowerCell borrower={domain.rentals.items[0].borrower} />
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Tag className="h-4 w-4 text-gray-500" />
                              {domain.price ? `${formatEther(BigInt(domain.price))} ETH` : "-"}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {domain.status === RentalStatus.available && (
                                <Button
                                  size="sm"
                                  className="w-28"
                                  variant="outline"
                                  onClick={() => router.push(`/lend?domain=${domain.name}`)}
                                >
                                  List for Rent
                                </Button>
                              )}
                              {domain.status === RentalStatus.listed && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-28"
                                  onClick={() =>
                                    setUnlistDomain({
                                      id: domain.id,
                                      name: domain.name,
                                    })
                                  }
                                >
                                  Unlist
                                </Button>
                              )}
                              {(domain.status === RentalStatus.rentedOut ||
                                domain.status === RentalStatus.rentedIn) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-28"
                                  onClick={() => router.push(`/manage/${domain.name}`)}
                                >
                                  View Details
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!unlistDomain} onOpenChange={() => setUnlistDomain(null)}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Confirm Unlist</DialogTitle>
            <DialogDescription>
              Are you sure you want to unlist {unlistDomain?.name}? This will remove it from the rental marketplace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlistDomain(null)}>
              Cancel
            </Button>
            <Button onClick={handleUnlist}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const getTimeUntilExpiry = (expiryDate: string) => {
  const now = new Date();
  const expiry = new Date(parseInt(expiryDate) * 1000);
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return daysLeft;
};

const sortDomains = (domains: Domain[], sortBy: string) => {
  return [...domains].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "expiry":
        if (!a.maxRentalTime) return 1;
        if (!b.maxRentalTime) return -1;
        return new Date(a.maxRentalTime).getTime() - new Date(b.maxRentalTime).getTime();
      case "price":
        if (!a.price) return 1;
        if (!b.price) return -1;
        return a.price - b.price;
      default:
        return 0;
    }
  });
};
