import { labelhash } from 'viem';
import { RentalStatus } from '~~/types/types';

/**
 * Converts an ENS domain into a token identifier.
 * @param domain The ENS domain, e.g., "example.eth"
 * @returns The token ID as a string, derived via labelhash.
 */
export function getTokenIdFromDomain(domain: string): string {
  return BigInt(labelhash(domain.replace('.eth', ''))).toString();
}

/**
 * Determines the rental status of the listing.
 * @param listingData The listing data fetched from the GraphQL API.
 * @param mostRecentRental The most recent rental record, if available.
 * @param address The current user's wallet address.
 * @returns The rental status.
 */
export function determineRentalStatus(
  listingData: any,
  mostRecentRental: any,
  address?: string
): RentalStatus {
  const now = Math.floor(Date.now() / 1000);

  const rentalExpiry = mostRecentRental?.endTime
    ? parseInt(mostRecentRental.endTime)
    : 0;

  if (listingData.lender === address && rentalExpiry > now) {
    return RentalStatus.rentedOut;
  } else if (mostRecentRental?.borrower === address && rentalExpiry > now) {
    return RentalStatus.rentedIn;
  } else if (rentalExpiry < now) {
    return RentalStatus.expired;
  } else {
    return RentalStatus.listed;
  }
}
