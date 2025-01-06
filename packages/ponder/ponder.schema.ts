import { index, onchainTable, relations, primaryKey } from "ponder";

export const listing = onchainTable("listing", (t) => ({
  id: t.text().notNull(), // Tx hash of listing
  tokenId: t.bigint().notNull(), // Domain's ERC721 token ID
  name: t.text().notNull(), // ENS name (e.g., "crypto.eth")
  lender: t.text().notNull(), // Owner's address
  price: t.bigint().notNull(), // Price for rentals
  node: t.text().notNull(), // Domain's namehash
  maxRentalTime: t.bigint().notNull(), // Max rental time
  createdAt: t.bigint().notNull(), // Event block timestamp
}),
  (table) => ({
    primaryKey: primaryKey({ columns: [table.id, table.tokenId] }),
    idIdx: index().on(table.id),
    tokenIdIdx: index().on(table.tokenId),
    lenderIdx: index().on(table.lender),
  }));

export const listingRelations = relations(listing, ({ many }) => ({
  rentals: many(rental),
}));

export const rental = onchainTable("rental", (t) => ({
  id: t.text().notNull(), // Tx hash of rental
  tokenId: t.bigint().notNull(), // Domain's ERC721 token ID
  borrower: t.text().notNull(), // Renter's address
  startTime: t.bigint().notNull(), // Rental start timestamp
  endTime: t.bigint().notNull(), // Rental end timestamp
  price: t.bigint().notNull(), // Rate paid
  listingId: t.text().notNull(), // ID of the listing
  createdAt: t.bigint().notNull(), // Event block timestamp
}),
  (table) => ({
    primaryKey: primaryKey({ columns: [table.id, table.tokenId] }),
    idIdx: index().on(table.id),
    tokenIdIdx: index().on(table.tokenId),
    borrowerIdx: index().on(table.borrower),
  }));

export const rentalRelations = relations(rental, ({ one }) => ({
  listing: one(listing, { fields: [rental.listingId], references: [listing.id] }),
}));
