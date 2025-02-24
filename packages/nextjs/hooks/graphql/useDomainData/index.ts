import { useEffect, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { Domain } from '~~/types/types';
import { getEnsRentGraphQL } from '~~/wagmi';
import { GET_LISTINGS_QUERY } from './queries';
import { determineRentalStatus, getTokenIdFromDomain } from './utils';

/**
 * Custom hook to fetch and return ENS domain data.
 *
 * @param domain The ENS domain to retrieve data for.
 * @returns A tuple containing the domain object, a loading boolean, and an error string or null.
 */
export default function useDomainData(
  domain: string
): [Domain | null, boolean, string | null] {
  const [listing, setListing] = useState<Domain | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { address } = useAccount();

  const publicClient = usePublicClient();
  const ensRentGraphQL = getEnsRentGraphQL(publicClient?.chain.id || 1);

  useEffect(() => {
    const fetchListings = async () => {
      setIsLoading(true);

      if (!domain) {
        setListing(null);
        setError('Domain is required');
        setIsLoading(false);
        return;
      }

      if (!ensRentGraphQL) {
        setError('GraphQL endpoint not available');
        setIsLoading(false);
        return;
      }

      try {
        const tokenId = getTokenIdFromDomain(domain);

        const response = await fetch(ensRentGraphQL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: GET_LISTINGS_QUERY,
            variables: { tokenId },
          }),
        });

        const responseData = await response.json();
        console.log('responseData', responseData);

        if (responseData.errors) {
          throw new Error(`GraphQL Error: ${responseData.errors[0].message}`);
        }
        if (!responseData || !responseData.data) {
          throw new Error('Invalid response data');
        }

        const listingFromGraph = responseData.data.listing;

        if (!listingFromGraph) {
          setError('Listings not found');
          return;
        }

        const mostRecentRental = listingFromGraph.rentals?.items[0];
        const hasActiveRental =
          listingFromGraph.rentals?.items.length > 0 &&
          mostRecentRental?.endTime &&
          parseInt(mostRecentRental.endTime) > Math.floor(Date.now() / 1000);

        const status = determineRentalStatus(
          listingFromGraph,
          mostRecentRental,
          address
        );

        const formattedRentals = listingFromGraph.rentals?.items.map(
          (rental: any) => ({
            id: rental?.id,
            borrower: rental?.borrower,
            startTime: parseInt(rental?.startTime) * 1000,
            endTime: parseInt(rental?.endTime) * 1000,
            price: rental?.price,
          })
        );

        // const formattedRentals = [
        //   { id: '1', borrower: '0x', startTime: '1', endTime: '2', price: '3' },
        // ];

        console.log('last rental', new Date(formattedRentals[0]?.endTime));
        setListing({
          ...listingFromGraph,
          status,
          hasActiveRental,
          rentals: formattedRentals,
        });
      } catch (err) {
        console.error(err);
        setError('Error fetching listing details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchListings();
  }, [domain, address, ensRentGraphQL]);

  return [listing, isLoading, error];
}
