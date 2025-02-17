/**
 * GraphQL query for fetching ENS domain listings.
 */
export const GET_LISTINGS_QUERY = `
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
`;
