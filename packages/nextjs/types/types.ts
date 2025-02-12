export enum RentalStatus {
  available = 'available',
  rentedOut = 'rented out',
  rentedIn = 'rented in',
  listed = 'listed',
  expired = 'expired',
}

export interface Domain {
  id: string;
  price?: number;
  lender: `0x${string}`;
  name: string;
  isWrapped?: boolean;
  createdAt: string;
  maxRentalTime?: string;
  node: string;
  tokenId: string;
  status: RentalStatus;
  hasActiveRental?: boolean;
  rentals?: {
    id: string;
    startTime: number;
    endTime: number;
    borrower: `0x${string}`;
    price: number;
  }[];
}
