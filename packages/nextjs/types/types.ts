export enum RentalStatus {
  available = "available",
  rentedOut = "rented out",
  rentedIn = "rented in",
  listed = "listed",
}

export interface Domain {
  id: string;
  price?: number;
  lender: string;
  name: string;
  isWrapped?: boolean;
  createdAt: string;
  maxRentalTime?: string;
  node: string;
  tokenId: string;
  status: RentalStatus;
  hasActiveRental?: boolean;
  rentals?: {
    items: {
      id: string;
      startTime: number;
      endTime: number;
      borrower: string;
      price: number;
    }[];
  };
}
