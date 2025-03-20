import { useMemo, useState } from 'react';
import { ApolloClient, InMemoryCache, gql } from '@apollo/react-hooks';
import { Address, formatEther } from 'viem';
import { useChainId } from 'wagmi';
import { Domain } from '~~/types/types';
import { getEnsRentGraphQL } from '~~/wagmi';

const oneYearInSeconds = 365 * 24 * 60 * 60;
const pageSize = 15;
const calculateYearlyPrice = (pricePerSecond: string | number): bigint => {
  return BigInt(pricePerSecond || 0) * BigInt(oneYearInSeconds);
};

export default function useAvailableDomains(
  lender: Address | undefined
): [
  (param?: string, orderBy?: string) => Promise<Domain[]>,
  (param?: string, orderBy?: string) => Promise<Domain[]>,
  (param?: string, orderBy?: string) => Promise<Domain[]>,
  boolean,
  boolean,
] {
  const chainId = useChainId();
  const ensRentGraphQL = getEnsRentGraphQL(chainId);

  // Pagination state
  const [startCursorState, setStartCursorState] = useState<string | null>(null);
  const [endCursorState, setEndCursorState] = useState<string | null>(null);
  const [hasNextPageState, setHasNextPageState] = useState<boolean>(false);
  const [hasPreviousPageState, setHasPreviousPageState] =
    useState<boolean>(false);

  const client = useMemo(
    () =>
      new ApolloClient({
        uri: ensRentGraphQL,
        cache: new InMemoryCache(),
      }),
    [ensRentGraphQL, chainId]
  );

  // Move the domain formatting logic to a separate function for reuse
  const formatDomainsData = (queryData: any): Domain[] => {
    let result: Domain[] = [];

    if (queryData?.listings?.items) {
      const availableDomains = queryData.listings.items.map(
        (listing: Domain) => {
          const pricePerYear = calculateYearlyPrice(listing.price || 0);
          const priceInEth = formatEther(pricePerYear);

          return {
            id: listing.id,
            maxRentalTime: listing.maxRentalTime,
            createdAt: listing.createdAt,
            isWrapped: listing.isWrapped,
            lender: listing.lender,
            node: listing.node,
            name: `${listing.name}.eth`,
            price: priceInEth,
            tokenId: listing.tokenId,
            rentals: listing.rentals,
          };
        }
      );

      // First sort rentals within each domain by endTime (most recent first)
      const domainsWithSortedRentals = availableDomains.map((domain: any) => {
        if (domain.rentals?.items?.length) {
          return {
            ...domain,
            rentals: {
              ...domain.rentals,
              items: [...domain.rentals.items].sort(
                (a, b) => Number(b.endTime || 0) - Number(a.endTime || 0)
              ),
            },
          };
        }
        return domain;
      });

      // Then sort domains
      const sortedDomains = domainsWithSortedRentals.sort((a: any, b: any) => {
        // Sort by rental status first (domains without rentals come first)
        if (!a.rentals?.items?.length && b.rentals?.items?.length) return -1;
        if (a.rentals?.items?.length && !b.rentals?.items?.length) return 1;

        // If both have rentals, sort by the most recent rental's end time
        if (a.rentals?.items?.length && b.rentals?.items?.length) {
          return (
            Number(b.rentals.items[0]?.endTime || 0) -
            Number(a.rentals.items[0]?.endTime || 0)
          );
        }

        // Fall back to maxRentalTime if rental information is equivalent
        return (
          new Date(a.maxRentalTime).getTime() -
          new Date(b.maxRentalTime).getTime()
        );
      });

      result = sortedDomains.filter((domain: any) => {
        const lastRentEndTime = domain?.rentals?.items[0]?.endTime;
        return !lastRentEndTime || lastRentEndTime < Date.now() / 1000;
      });
    }

    return result;
  };

  const getOrderByClause = (orderBy?: string) => {
    switch (orderBy) {
      case 'price':
        return 'orderBy: "price", orderDirection: "asc"';
      case 'time':
        return 'orderBy: "maxRentalTime", orderDirection: "desc"';
      default:
        return '';
    }
  };

  const getWhereClause = (param?: string) => {
    const whereConditions = [];
    const currentTimestamp = Math.floor(Date.now() / 1000); // Convert to seconds

    // Always add the maxRentalTime condition
    whereConditions.push(`maxRentalTime_gt: "${currentTimestamp}"`);

    if (lender) whereConditions.push(`lender_not: "${lender}"`);
    if (param) whereConditions.push(`name_contains: "${param}"`);

    return whereConditions.length
      ? `where: {${whereConditions.join(', ')}}`
      : 'where: {}';
  };

  const getInitialPage = async (
    param?: string,
    orderBy?: string
  ): Promise<Domain[]> => {
    // Reset pagination state
    setStartCursorState(null);
    setEndCursorState(null);
    setHasNextPageState(false);
    setHasPreviousPageState(false);

    const whereClause = getWhereClause(param);
    const orderByClause = getOrderByClause(orderBy);

    const { data } = await client.query({
      query: gql`
        query GetListings {
          listings(
            limit: ${pageSize}
            ${whereClause}
            ${orderByClause}
          ) {
            items {
              id
              maxRentalTime
              createdAt
              isWrapped
              lender
              node
              name
              price
              tokenId
              rentals {
                items {
                  endTime
                  borrower
                }
              }
            }
            pageInfo {
              startCursor
              endCursor
              hasNextPage
              hasPreviousPage
            }
          }
        }
      `,
    });

    setStartCursorState(data.listings.pageInfo.startCursor);
    setEndCursorState(data.listings.pageInfo.endCursor);
    setHasNextPageState(data.listings.pageInfo.hasNextPage);
    setHasPreviousPageState(data.listings.pageInfo.hasPreviousPage);

    return formatDomainsData(data);
  };

  const getNextPage = async (
    param?: string,
    orderBy?: string
  ): Promise<Domain[]> => {
    const afterParam = endCursorState ? `, after: "${endCursorState}"` : '';
    const whereClause = getWhereClause(param);
    const orderByClause = getOrderByClause(orderBy);

    const { data } = await client.query({
      query: gql`
        query GetListings {
          listings(
            limit: ${pageSize}
            ${whereClause}
            ${orderByClause}
            ${afterParam}
          ) {
            items {
              id
              maxRentalTime
              createdAt
              isWrapped
              lender
              node
              name
              price
              tokenId
              rentals {
                items {
                  endTime
                  borrower
                }
              }
            }
            pageInfo {
              startCursor
              endCursor
              hasNextPage
              hasPreviousPage
            }
          }
        }
      `,
    });

    setStartCursorState(data.listings.pageInfo.startCursor);
    setEndCursorState(data.listings.pageInfo.endCursor);
    setHasNextPageState(data.listings.pageInfo.hasNextPage);
    setHasPreviousPageState(data.listings.pageInfo.hasPreviousPage);

    return formatDomainsData(data);
  };

  const getPreviousPage = async (
    param?: string,
    orderBy?: string
  ): Promise<Domain[]> => {
    const beforeParam = startCursorState
      ? `, before: "${startCursorState}"`
      : '';
    const whereClause = getWhereClause(param);
    const orderByClause = getOrderByClause(orderBy);

    const { data } = await client.query({
      query: gql`
        query GetListings {
          listings(
            limit: ${pageSize}
            ${whereClause}
            ${orderByClause}
            ${beforeParam}
          ) {
            items {
              id
              maxRentalTime
              createdAt
              isWrapped
              lender
              node
              name
              price
              tokenId
              rentals {
                items {
                  endTime
                  borrower
                }
              }
            }
            pageInfo {
              startCursor
              endCursor
              hasNextPage
              hasPreviousPage
            }
          }
        }
      `,
    });

    setStartCursorState(data.listings.pageInfo.startCursor);
    setEndCursorState(data.listings.pageInfo.endCursor);
    setHasNextPageState(data.listings.pageInfo.hasNextPage);
    setHasPreviousPageState(data.listings.pageInfo.hasPreviousPage);

    return formatDomainsData(data);
  };

  return [
    getInitialPage,
    getNextPage,
    getPreviousPage,
    hasNextPageState,
    hasPreviousPageState,
  ];
}
