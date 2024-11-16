// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

import "./interfaces/IENSRegistry.sol";
import "./interfaces/IBaseRegistrar.sol";
import "./interfaces/INameWrapper.sol";

/**
 * @title ENSRent
 * @notice A contract for renting ENS domains, supporting both wrapped (ERC1155) and unwrapped (ERC721) names
 * @dev Allows users to list their ENS domains for rent and others to rent them for a specified duration
 */
contract ENSRent is ERC721Holder, ERC1155Holder {
    // Core ENS contracts
    IBaseRegistrar public immutable baseRegistrar;
    IENSRegistry public immutable ensRegistry;
    INameWrapper public immutable nameWrapper;

    /**
     * @notice Rental terms for a domain
     * @param lender Address of the domain owner
     * @param pricePerSecond Price in wei per second for renting
     * @param maxEndTimestamp Maximum timestamp until which the domain can be rented
     * @param currentBorrower Current renter of the domain
     * @param rentalEnd Timestamp when current rental ends
     * @param nameNode ENS node hash of the domain
     */
    struct RentalTerms {
        address lender;
        uint256 pricePerSecond;
        uint256 maxEndTimestamp;
        address currentBorrower;
        uint256 rentalEnd;
        bytes32 nameNode;
    }

    /// @notice Mapping from tokenId to rental terms
    mapping(uint256 => RentalTerms) public rentalTerms;

    // Events
    /**
     * @notice Emitted when a domain is listed for rent
     * @param tokenId The ERC721 token ID of the domain
     * @param lender Address of the domain owner
     * @param pricePerSecond Price in wei per second
     * @param maxEndTimestamp Maximum allowed rental end time
     * @param nameNode ENS node hash of the domain
     */
    event DomainListed(
        uint256 indexed tokenId,
        address indexed lender,
        uint256 pricePerSecond,
        uint256 maxEndTimestamp,
        bytes32 nameNode
    );

    /**
     * @notice Emitted when a domain is rented
     * @param tokenId The ERC721 token ID of the domain
     * @param borrower Address of the renter
     * @param rentalEnd Timestamp when rental ends
     * @param totalPrice Total price paid for the rental
     */
    event DomainRented(uint256 indexed tokenId, address indexed borrower, uint256 rentalEnd, uint256 totalPrice);

    /**
     * @notice Emitted when a domain is reclaimed by owner
     * @param tokenId The ERC721 token ID of the domain
     * @param lender Address of the domain owner
     */
    event DomainReclaimed(uint256 indexed tokenId, address indexed lender);

    /**
     * @notice Emitted when rental terms are updated
     * @param tokenId The ERC721 token ID of the domain
     * @param newPricePerSecond New price per second
     * @param newMaxEndTimestamp New maximum end timestamp
     */
    event RentalTermsUpdated(uint256 indexed tokenId, uint256 newPricePerSecond, uint256 newMaxEndTimestamp);

    // Custom errors
    error ZeroPriceNotAllowed();
    error MaxEndTimeMustBeFuture();
    error MaxEndTimeExceedsExpiry();
    error DomainNotListed();
    error ExceedsMaxEndTime();
    error EndTimeMustBeFuture();
    error DomainCurrentlyRented();
    error InsufficientPayment();
    error EtherTransferFailed();
    error NotLender();
    error ActiveRentalPeriod();
    error NoActiveRental();
    error RentalNotExpired();

    /**
     * @notice Contract constructor
     * @param _nameWrapper Address of the ENS name wrapper contract
     * @param _baseRegistrarAddress Address of the ENS base registrar contract
     * @param _ensRegistryAddress Address of the ENS registry contract
     */
    constructor(address _nameWrapper, address _baseRegistrarAddress, address _ensRegistryAddress) {
        nameWrapper = INameWrapper(_nameWrapper);
        baseRegistrar = IBaseRegistrar(_baseRegistrarAddress);
        ensRegistry = IENSRegistry(_ensRegistryAddress);
    }

    /**
     * @notice List a domain for rent
     * @dev Handles both wrapped (ERC1155) and unwrapped (ERC721) names
     * @param tokenId The ERC721 token ID of the domain
     * @param pricePerSecond Price in wei per second for renting
     * @param maxEndTimestamp Maximum timestamp until which the domain can be rented
     * @param nameNode ENS node hash of the domain
     */
    function listDomain(uint256 tokenId, uint256 pricePerSecond, uint256 maxEndTimestamp, bytes32 nameNode) external {
        // Validate inputs
        if (pricePerSecond == 0) revert ZeroPriceNotAllowed();
        if (maxEndTimestamp <= block.timestamp) revert MaxEndTimeMustBeFuture();
        if (maxEndTimestamp >= baseRegistrar.nameExpires(tokenId)) revert MaxEndTimeExceedsExpiry();

        // Handle wrapped vs unwrapped domains differently
        if (baseRegistrar.ownerOf(tokenId) == address(nameWrapper)) {
            // For wrapped domains: transfer ERC1155 token and unwrap
            nameWrapper.safeTransferFrom(msg.sender, address(this), uint256(nameNode), 1, "");
            nameWrapper.unwrapETH2LD(bytes32(tokenId), address(this), address(this));
        } else {
            // For unwrapped domains: transfer ERC721 token and reclaim
            baseRegistrar.safeTransferFrom(msg.sender, address(this), tokenId);
            baseRegistrar.reclaim(tokenId, address(this));
        }

        // Store rental terms
        rentalTerms[tokenId] = RentalTerms({
            lender: msg.sender,
            pricePerSecond: pricePerSecond,
            maxEndTimestamp: maxEndTimestamp,
            currentBorrower: address(0),
            rentalEnd: 0,
            nameNode: nameNode
        });

        emit DomainListed(tokenId, msg.sender, pricePerSecond, maxEndTimestamp, nameNode);
    }

    /**
     * @notice Rent a listed domain
     * @param tokenId The ERC721 token ID of the domain
     * @param desiredEndTimestamp Desired timestamp for rental to end
     */
    function rentDomain(uint256 tokenId, uint256 desiredEndTimestamp) external payable {
        RentalTerms storage terms = rentalTerms[tokenId];

        // Validate rental conditions
        if (terms.lender == address(0)) revert DomainNotListed();
        if (desiredEndTimestamp > terms.maxEndTimestamp) revert ExceedsMaxEndTime();
        if (desiredEndTimestamp <= block.timestamp) revert EndTimeMustBeFuture();
        if (terms.currentBorrower != address(0) && block.timestamp < terms.rentalEnd) revert DomainCurrentlyRented();

        // Calculate rental price
        uint256 duration = desiredEndTimestamp - block.timestamp;
        uint256 totalPrice = terms.pricePerSecond * duration;

        if (msg.value < totalPrice) revert InsufficientPayment();

        // Transfer ENS name control to borrower
        ensRegistry.setOwner(terms.nameNode, msg.sender);

        // Update rental terms
        terms.currentBorrower = msg.sender;
        terms.rentalEnd = desiredEndTimestamp;

        // Transfer payment to lender
        (bool sent,) = payable(terms.lender).call{ value: totalPrice }("");
        if (!sent) revert EtherTransferFailed();

        // Refund excess payment
        if (msg.value > totalPrice) {
            (bool refundSent,) = payable(msg.sender).call{ value: msg.value - totalPrice }("");
            if (!refundSent) revert EtherTransferFailed();
        }

        emit DomainRented(tokenId, msg.sender, desiredEndTimestamp, totalPrice);
    }

    /**
     * @notice Reclaim a domain after rental period
     * @dev Can only be called by the lender after rental period ends
     * @param tokenId The ERC721 token ID of the domain
     */
    function reclaimDomain(uint256 tokenId) external {
        RentalTerms storage terms = rentalTerms[tokenId];
        if (msg.sender != terms.lender) revert NotLender();
        if (block.timestamp < terms.rentalEnd) revert ActiveRentalPeriod();

        // Return ENS name control to lender
        ensRegistry.setOwner(terms.nameNode, terms.lender);
        baseRegistrar.safeTransferFrom(address(this), terms.lender, tokenId);

        delete rentalTerms[tokenId];

        emit DomainReclaimed(tokenId, terms.lender);
    }
}