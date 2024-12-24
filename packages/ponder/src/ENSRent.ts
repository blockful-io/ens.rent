import { ponder } from "ponder:registry";
import { rental, listing } from "ponder:schema";

ponder.on("ENSRent:DomainListed", async ({ event, context }) => {
    await context.db.insert(listing).values({
        id: event.transaction.hash,
        tokenId: event.args.tokenId,
        name: event.args.name,
        lender: event.args.lender,
        price: event.args.minPricePerSecond,
        node: event.args.nameNode,
        maxRentalTime: event.args.maxEndTimestamp,
        createdAt: event.block.timestamp,
    });
});

ponder.on("ENSRent:DomainRented", async ({ event, context }) => {
    const _listing = await context.db.find(listing, { tokenId: event.args.tokenId })

    if (!_listing) {
        throw new Error(`Listing not found for tokenId: ${event.args.tokenId}`)
    }

    await context.db.insert(rental).values({
        id: event.transaction.hash,
        tokenId: event.args.tokenId,
        borrower: event.args.borrower,
        startTime: event.block.timestamp,
        endTime: event.args.rentalEnd,
        price: event.args.pricePerSecond,
        listingId: _listing.id,
        createdAt: event.block.timestamp,
    });
});

ponder.on("ENSRent:DomainReclaimed", async ({ event, context }) => {
    await context.db.delete(listing, { tokenId: event.args.tokenId })
});