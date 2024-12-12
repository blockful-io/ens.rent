// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IENSRent {
    //// EVENTS ////

    /**
     * @notice Emitted when a domain is listed for rent
     * @param tokenId Domain's ERC721 token ID
     * @param lender Domain owner's address
     * @param minPricePerSecond Floor price for rentals
     * @param maxEndTimestamp Latest allowed rental end time
     * @param nameNode Domain's namehash
     * @dev Triggered in listDomain function when domain is first listed
     */
    event DomainListed(
        string name,
        uint256 indexed tokenId,
        address indexed lender,
        uint256 minPricePerSecond,
        uint256 maxEndTimestamp,
        bytes32 nameNode
    );

    /**
     * @notice Emitted when a domain is rented
     * @param tokenId Domain's ERC721 token ID
     * @param borrower Renter's address
     * @param rentalEnd Rental end timestamp
     * @param totalPrice Total price paid for rental
     * @param pricePerSecond Rate paid per second
     * @dev Includes actual price paid from Dutch auction
     */
    event DomainRented(
        uint256 indexed tokenId, address indexed borrower, uint256 rentalEnd, uint256 totalPrice, uint256 pricePerSecond
    );

    /**
     * @notice Emitted when owner reclaims their domain
     * @param tokenId Domain's ERC721 token ID
     * @param lender Owner's address
     * @dev Only emitted after rental period ends
     */
    event DomainReclaimed(uint256 indexed tokenId, address indexed lender);

    //// ERRORS ////

    /**
     * @notice Minimum price must be greater than zero
     * @dev Thrown in listDomain when minPricePerSecond = 0
     */
    error ZeroPriceNotAllowed();

    /**
     * @notice Maximum rental end time must be future timestamp
     * @dev Thrown when maxEndTimestamp <= current time
     */
    error MaxEndTimeMustBeFuture();

    /**
     * @notice Maximum end time cannot exceed domain expiry
     * @dev Ensures domain doesn't expire during rental period
     */
    error MaxEndTimeExceedsExpiry();

    /**
     * @notice Domain must be listed before renting
     * @dev Thrown when attempting to rent unlisted domain
     */
    error DomainNotListed();

    /**
     * @notice Rental end time exceeds maximum allowed
     * @dev Enforces owner-set maximum rental duration
     */
    error ExceedsMaxEndTime();

    /**
     * @notice Rental end time must be in the future
     * @dev Basic timestamp validation
     */
    error EndTimeMustBeFuture();

    /**
     * @notice Cannot rent domain during active rental
     * @dev Prevents overlapping rentals
     */
    error DomainCurrentlyRented();

    /**
     * @notice Payment must cover calculated rental cost
     * @dev Ensures sufficient payment for desired duration
     */
    error InsufficientPayment();

    /**
     * @notice ETH transfer failed
     * @dev Safety check for ETH transfers
     */
    error EtherTransferFailed();

    /**
     * @notice Only domain owner can perform action
     * @dev Access control for owner operations
     */
    error NotLender();
}
