import { useEffect, useState } from "react";
import { labelhash } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { Domain, RentalStatus } from "~~/types/types";
import { getEnsRentGraphQL } from "~~/wagmi";

export default function useDomainData(domain: string): [Domain | null, boolean, string | null] {
  const [listing, setListing] = useState<Domain | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { address } = useAccount();

  const publicClient = usePublicClient();
  const ensRentGraphQL = getEnsRentGraphQL(publicClient?.chain.id || 1);

  useEffect(() => {
    const fetchListings = async () => {
      setIsLoading(true);

      if (!domain) return;

      try {
        if (!ensRentGraphQL) return;
        const response = await fetch(ensRentGraphQL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `
              query GetListings($tokenId: BigInt!) {
                listing(tokenId: $tokenId) {
                  createdAt
                  id
                  lender
                  maxRentalTime
                  name
                  node
                  price
                  tokenId
                  rentals {
                    items { 
                      id
                      startTime
                      price
                      endTime
                      borrower
                    }
                  }
                }
              }
            `,
            variables: {
              tokenId: BigInt(labelhash(domain.replace(".eth", ""))).toString(),
            },
          }),
        });

        const responseData = await response.json();

        if (responseData.errors) {
          throw new Error(`GraphQL Error: ${responseData.errors[0].message}`);
        }

        if (!responseData || !responseData.data) {
          throw new Error("Invalid response data");
        }

        const _listing = responseData.data.listing;

        if (!_listing) {
          setError("Listings not found");
          return;
        }

        const mostRecentRental = _listing.rentals?.items[0];
        const hasActiveRental =
          _listing.rentals.items.length > 0 &&
          mostRecentRental.endTime &&
          parseInt(mostRecentRental.endTime) > Math.floor(Date.now() / 1000);

        const now = Math.floor(Date.now() / 1000); // current time in seconds
        const rentalExpiry = mostRecentRental?.endTime ? parseInt(mostRecentRental.endTime) : 0;

        let status = RentalStatus.available;
        if (_listing.lender === address && rentalExpiry > now) {
          status = RentalStatus.rentedOut;
        } else if (mostRecentRental?.borrower === address && rentalExpiry > now) {
          status = RentalStatus.rentedIn;
        } else {
          status = RentalStatus.listed;
        }

        setListing({
          ..._listing,
          status,
          hasActiveRental,
          rentals: _listing.rentals.items.map((rental: any) => ({
            id: rental.id,
            borrower: rental.borrower,
            startTime: parseInt(rental.startTime) * 1000,
            endTime: parseInt(rental.endTime) * 1000,
            price: rental.price,
          })),
        });
      } catch (err) {
        setError("Error fetching listing details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchListings();
  }, [domain]);

  return [listing, isLoading, error];
}
