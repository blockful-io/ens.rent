import { useMemo, useState } from "react";
import { ApolloClient, InMemoryCache, gql } from "@apollo/react-hooks";
import { Address } from "viem";
import { useChainId } from "wagmi";
import { getEnsRentGraphQL } from "~~/wagmi";

export type RentedDomainType = {
  id: string;
  startTime: string;
  endTime: string;
  borrower: string;
  listing: {
    id: string;
    name: string;
    price: string;
    lender: string;
  };
};

const pageSize = 15;

export default function useRentedDomains(
  address: Address | undefined,
): [
  (param?: string, orderBy?: string) => Promise<RentedDomainType[]>,
  (param?: string, orderBy?: string) => Promise<RentedDomainType[]>,
  (param?: string, orderBy?: string) => Promise<RentedDomainType[]>,
  boolean,
  boolean,
] {
  const chainId = useChainId();
  const ensRentGraphQL = getEnsRentGraphQL(chainId);

  // Pagination state
  const [startCursorState, setStartCursorState] = useState<string | null>(null);
  const [endCursorState, setEndCursorState] = useState<string | null>(null);
  const [hasNextPageState, setHasNextPageState] = useState<boolean>(false);
  const [hasPreviousPageState, setHasPreviousPageState] = useState<boolean>(false);

  const client = useMemo(
    () =>
      new ApolloClient({
        uri: ensRentGraphQL,
        cache: new InMemoryCache(),
      }),
    [ensRentGraphQL],
  );

  const getOrderByClause = (orderBy?: string) => {
    switch (orderBy) {
      case "price":
        return 'orderBy: "price", orderDirection: "desc"';
      case "time":
        return 'orderBy: "startTime", orderDirection: "desc"';
      default:
        return "";
    }
  };

  const getWhereClause = (param?: string) => {
    const whereConditions = [];

    if (param) {
      // TODO: Replace with listingName_contains when the backend is updated
      whereConditions.push(`listingId_contains: "${param}"`);
    }

    return whereConditions.length ? `where: {${whereConditions.join(", ")}}` : "where: {}";
  };

  const getInitialPage = async (param?: string, orderBy?: string): Promise<RentedDomainType[]> => {
    setStartCursorState(null);
    setEndCursorState(null);
    setHasNextPageState(false);
    setHasPreviousPageState(false);

    const whereClause = getWhereClause(param);
    const orderByClause = getOrderByClause(orderBy);

    const { data } = await client.query({
      query: gql`
        query GetRentals {
          rentals(
            limit: ${pageSize}
            ${whereClause}
            ${orderByClause}
          ) {
            items {
              id
              startTime
              endTime
              borrower
              listing {
                id
                name
                price
                lender
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

    setStartCursorState(data.rentals.pageInfo.startCursor);
    setEndCursorState(data.rentals.pageInfo.endCursor);
    setHasNextPageState(data.rentals.pageInfo.hasNextPage);
    setHasPreviousPageState(data.rentals.pageInfo.hasPreviousPage);

    return data.rentals.items;
  };

  const getNextPage = async (param?: string, orderBy?: string): Promise<RentedDomainType[]> => {
    const afterParam = endCursorState ? `, after: "${endCursorState}"` : "";
    const whereClause = getWhereClause(param);
    const orderByClause = getOrderByClause(orderBy);

    const { data } = await client.query({
      query: gql`
        query GetRentals {
          rentals(
            limit: ${pageSize}
            ${whereClause}
            ${orderByClause}
            ${afterParam}
          ) {
            items {
              id
              startTime
              endTime
              borrower
              listing {
                id
                name
                price
                lender
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

    setStartCursorState(data.rentals.pageInfo.startCursor);
    setEndCursorState(data.rentals.pageInfo.endCursor);
    setHasNextPageState(data.rentals.pageInfo.hasNextPage);
    setHasPreviousPageState(data.rentals.pageInfo.hasPreviousPage);

    return data.rentals.items;
  };

  const getPreviousPage = async (param?: string, orderBy?: string): Promise<RentedDomainType[]> => {
    const beforeParam = startCursorState ? `, before: "${startCursorState}"` : "";
    const whereClause = getWhereClause(param);
    const orderByClause = getOrderByClause(orderBy);

    const { data } = await client.query({
      query: gql`
        query GetRentals {
          rentals(
            limit: ${pageSize}
            ${whereClause}
            ${orderByClause}
            ${beforeParam}
          ) {
            items {
              id
              startTime
              endTime
              borrower
              listing {
                id
                name
                price
                lender
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

    setStartCursorState(data.rentals.pageInfo.startCursor);
    setEndCursorState(data.rentals.pageInfo.endCursor);
    setHasNextPageState(data.rentals.pageInfo.hasNextPage);
    setHasPreviousPageState(data.rentals.pageInfo.hasPreviousPage);

    return data.rentals.items;
  };

  return [getInitialPage, getNextPage, getPreviousPage, hasNextPageState, hasPreviousPageState];
}
