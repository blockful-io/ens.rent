import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { Domain, RentalStatus } from '~~/types/types';
import { getEnsRentGraphQL } from '~~/wagmi';

export default function useListings({
  lender,
}: {
  lender: string;
}): [Domain[], Domain[], Domain[], Domain[], boolean] {
  const [listings, setListings] = useState<Domain[]>([]);
  const [expiredListings, setExpiredListings] = useState<Domain[]>([]);
  const [rentalIns, setRentalIns] = useState<Domain[]>([]);
  const [rentalOuts, setRentalOuts] = useState<Domain[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const publicClient = usePublicClient();
  const ensRentGraphQL = getEnsRentGraphQL(publicClient?.chain.id || 1);

  useEffect(() => {
    const fetchListings = async () => {
      if (!lender) return;
      setIsLoading(true);

      if (!ensRentGraphQL) return;

      const response = await fetch(ensRentGraphQL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
              query MyQuery($lender: String!) {
                listings(where: {lender: $lender}) {
                  items {
                    createdAt
                    id
                    isWrapped
                    lender
                    maxRentalTime
                    name
                    node
                    price
                    tokenId
                    rentals(where: {endTime_gte: "${Math.floor(Date.now() / 1000)}"}) {
                      items {
                        borrower
                      }
                    }
                  }
                }
                rentalIns: rentals(where: {borrower: $lender, endTime_gte: "${Math.floor(Date.now() / 1000)}"}) {
                  items {
                    borrower
                    endTime
                    startTime
                    listing {
                      createdAt
                      id
                      isWrapped
                      lender
                      maxRentalTime
                      name
                      node
                      price
                      tokenId
                    }
                  }
                }
                rentalOuts: listings(
                  where: {lender: $lender}
                ) {
                  items {
                    createdAt
                    id
                    isWrapped
                    lender
                    maxRentalTime
                    name
                    node
                    price
                    tokenId
                    rentals(where: {endTime_gte: "${Math.floor(Date.now() / 1000)}"}) {
                      items {
                        borrower
                        endTime
                        startTime
                      }
                    }
                  }
                }
              }
            `,
          variables: {
            lender,
          },
        }),
      });

      const responseData = await response.json();

      if (responseData.errors) {
        throw new Error(`GraphQL Error: ${responseData.errors[0].message}`);
      }

      if (!responseData || !responseData.data) {
        throw new Error('Invalid response data');
      }

      setListings(
        responseData.data.listings.items
          .filter(
            (listing: any) =>
              listing.rentals?.items?.length === 0 &&
              listing.maxRentalTime &&
              listing.maxRentalTime > Math.floor(Date.now() / 1000)
          )
          .map((listing: Domain) => ({
            ...listing,
            name: listing.name.endsWith('.eth')
              ? listing.name
              : `${listing.name}.eth`,
            status: RentalStatus.listed,
          }))
      );

      setExpiredListings(
        responseData.data.listings.items
          .filter(
            (listing: any) =>
              listing.rentals?.items?.length === 0 &&
              listing.maxRentalTime &&
              listing.maxRentalTime < Math.floor(Date.now() / 1000)
          )
          .map((listing: Domain) => ({
            ...listing,
            name: listing.name.endsWith('.eth')
              ? listing.name
              : `${listing.name}.eth`,
            status: RentalStatus.expired,
          }))
      );

      setRentalIns(
        responseData.data.rentalIns.items.map((rental: any) => ({
          ...rental.listing,
          name: rental?.listing?.name.endsWith('.eth')
            ? rental?.listing?.name
            : `${rental?.listing?.name}.eth`,
          status: RentalStatus.rentedIn,
          rentals: [
            {
              borrower: rental.borrower,
              startTime: rental.startTime,
              endTime: rental.endTime,
              price: rental?.listing?.price,
            },
          ],
        }))
      );

      setRentalOuts(
        responseData.data.listings.items
          .filter((listing: any) => listing.rentals?.items?.length > 0)
          .map((listing: any) => ({
            ...listing,
            name: listing?.name?.endsWith('.eth')
              ? listing?.name
              : `${listing?.name}.eth`,
            status: RentalStatus.rentedOut,
            rentals: [
              ...listing?.rentals?.items.map((rental: any) => ({
                borrower: rental?.borrower,
                startTime: rental?.startTime,
                endTime: rental?.endTime,
                price: listing?.price,
              })),
            ],
          }))
      );

      setIsLoading(false);
    };

    fetchListings();
  }, [lender]);

  return [listings, expiredListings, rentalIns, rentalOuts, isLoading];
}
