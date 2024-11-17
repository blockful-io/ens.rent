// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

import "./interfaces/IENSRegistry.sol";
import "./interfaces/IBaseRegistrar.sol";
import "./interfaces/INameWrapper.sol";

/**
 * @title ENSRent
 * @author Alex Netto
 * @notice ENS domain rental contract with Dutch auction mechanism
 * @dev Implements rental functionality for both wrapped (ERC1155) and unwrapped (ERC721) ENS names
 *      Features Dutch auctions that start at domain listing and after each rental expiry
 *      Prices decay from 0.01 ETH/second to a minimum price set by the domain owner
 */
contract ENSRent is ERC721Holder, ERC1155Holder {
    /**
     * @notice The ENS base registrar contract for managing .eth domains
     * @dev Used for handling ERC721 transfers and domain management
     */
    IBaseRegistrar public immutable baseRegistrar;

    /**
     * @notice The ENS registry contract for managing domain ownership
     * @dev Used to update domain control during rental periods
     */
    IENSRegistry public immutable ensRegistry;

    /**
     * @notice The ENS name wrapper contract for handling wrapped domains
     * @dev Used for ERC1155 transfers and wrapped domain management
     */
    INameWrapper public immutable nameWrapper;

    /**
     * @notice Duration of each Dutch auction in seconds
     * @dev After this period, price stabilizes at minPricePerSecond
     */
    uint256 public constant AUCTION_DURATION = 7 days;

    /**
     * @notice Initial price per second in Dutch auction
     * @dev Price decays from this value to minPricePerSecond over AUCTION_DURATION
     */
    uint256 public constant STARTING_PRICE_PER_SECOND = 1 gwei;

    /**
     * @notice Decay rate denominator for price calculation
     * @dev Higher value = slower price decay. Used in quadratic decay formula
     */
    uint256 public constant DECAY_RATE = 1000;

    /**
     * @notice Storage structure for domain rental information
     * @param lender Owner of the domain
     * @param minPricePerSecond Floor price set by owner
     * @param maxEndTimestamp Latest possible rental end date
     * @param currentBorrower Address currently renting the domain
     * @param rentalEnd Current rental end timestamp (or auction start if never rented)
     * @param nameNode Namehash of the ENS domain
     * @param tokenId ERC721 token ID of the domain
     */
    struct RentalTerms {
        address lender;
        uint256 minPricePerSecond;
        uint256 maxEndTimestamp;
        address currentBorrower;
        uint256 rentalEnd;
        bytes32 nameNode;
        uint256 tokenId;
    }

    /**
     * @notice Maps domain token IDs to their rental terms
     * @dev Primary storage for rental information
     */
    mapping(uint256 => RentalTerms) public rentalTerms;

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

    /**
     * @notice Cannot reclaim during active rental
     * @dev Protects renter's rights during rental period
     */
    error ActiveRentalPeriod();

    /**
     * @notice Initialize the rental contract
     * @param _nameWrapper Address of ENS NameWrapper contract
     * @param _baseRegistrarAddress Address of ENS BaseRegistrar contract
     * @param _ensRegistryAddress Address of ENS Registry contract
     * @dev Sets up immutable contract references
     */
    constructor(address _nameWrapper, address _baseRegistrarAddress, address _ensRegistryAddress) {
        nameWrapper = INameWrapper(_nameWrapper);
        baseRegistrar = IBaseRegistrar(_baseRegistrarAddress);
        ensRegistry = IENSRegistry(_ensRegistryAddress);
    }

    /**
     * @notice Calculate current Dutch auction price
     * @param terms Storage pointer to domain's rental terms
     * @return currentPrice Current price per second
     * @dev Implements quadratic decay from STARTING_PRICE to minPricePerSecond
     */
    function _getCurrentPrice(RentalTerms storage terms) internal view returns (uint256 currentPrice) {
        // Use rentalEnd as auction start time (initial listing or after rental)
        uint256 auctionStart = terms.rentalEnd;

        // Calculate time elapsed since auction start
        uint256 elapsed = block.timestamp - auctionStart;

        // Return floor price if auction duration passed
        if (elapsed >= AUCTION_DURATION) {
            return terms.minPricePerSecond;
        }

        // Calculate quadratic price decay
        uint256 remainingRatio = ((AUCTION_DURATION - elapsed) * DECAY_RATE) / AUCTION_DURATION;
        remainingRatio = (remainingRatio * remainingRatio) / DECAY_RATE;

        // Calculate current price difference from floor
        uint256 priceDiff = STARTING_PRICE_PER_SECOND - terms.minPricePerSecond;
        uint256 currentDiff = (priceDiff * remainingRatio) / DECAY_RATE;

        // Return current auction price
        return terms.minPricePerSecond + currentDiff;
    }

    /**
     * @notice List domain for rent and start initial auction
     * @param tokenId Domain's ERC721 token ID
     * @param minPricePerSecond Minimum rental price per second
     * @param maxEndTimestamp Latest possible rental end time
     * @param nameNode Domain's namehash
     * @dev Handles both wrapped and unwrapped domains
     */
    function listDomain(
        uint256 tokenId,
        uint256 minPricePerSecond,
        uint256 maxEndTimestamp,
        bytes32 nameNode,
        string calldata name
    )
        external
    {
        // Validate listing parameters
        if (minPricePerSecond == 0) revert ZeroPriceNotAllowed();
        if (maxEndTimestamp <= block.timestamp) revert MaxEndTimeMustBeFuture();
        if (maxEndTimestamp >= baseRegistrar.nameExpires(tokenId)) revert MaxEndTimeExceedsExpiry();

        // Handle domain transfer based on wrapper status
        if (baseRegistrar.ownerOf(tokenId) == address(nameWrapper)) {
            // For wrapped domains: transfer ERC1155 and unwrap
            nameWrapper.safeTransferFrom(msg.sender, address(this), uint256(nameNode), 1, "");
            nameWrapper.unwrapETH2LD(bytes32(tokenId), address(this), address(this));
        } else {
            // For unwrapped domains: transfer ERC721 and claim ownership
            baseRegistrar.safeTransferFrom(msg.sender, address(this), tokenId);
            baseRegistrar.reclaim(tokenId, address(this));
        }

        // Store rental terms and start auction
        rentalTerms[tokenId] = RentalTerms({
            lender: msg.sender,
            minPricePerSecond: minPricePerSecond,
            maxEndTimestamp: maxEndTimestamp,
            currentBorrower: address(0),
            rentalEnd: block.timestamp, // Start first auction immediately
            nameNode: nameNode,
            tokenId: tokenId
        });

        emit DomainListed(name, tokenId, msg.sender, minPricePerSecond, maxEndTimestamp, nameNode);
    }

    /**
     * @notice Rent domain at current auction price
     * @param tokenId Domain's ERC721 token ID
     * @param desiredEndTimestamp Requested rental end time
     * @dev Handles both initial auction and post-rental auctions
     */
    function rentDomain(uint256 tokenId, uint256 desiredEndTimestamp) external payable {
        RentalTerms storage terms = rentalTerms[tokenId];

        // Validate rental request
        if (terms.lender == address(0)) revert DomainNotListed();
        if (desiredEndTimestamp > terms.maxEndTimestamp) revert ExceedsMaxEndTime();
        if (desiredEndTimestamp <= block.timestamp) revert EndTimeMustBeFuture();
        if (terms.currentBorrower != address(0) && block.timestamp < terms.rentalEnd) revert DomainCurrentlyRented();

        // Calculate rental cost at current auction price
        uint256 pricePerSecond = _getCurrentPrice(terms);
        uint256 duration = desiredEndTimestamp - block.timestamp;
        uint256 totalPrice = pricePerSecond * duration;

        // Verify payment
        if (msg.value < totalPrice) revert InsufficientPayment();

        // Transfer domain control
        ensRegistry.setOwner(terms.nameNode, msg.sender);

        // Update rental terms
        terms.currentBorrower = msg.sender;
        terms.rentalEnd = desiredEndTimestamp;

        // Transfer payment to domain owner
        (bool sent,) = payable(terms.lender).call{ value: totalPrice }("");
        if (!sent) revert EtherTransferFailed();

        // Refund excess payment
        if (msg.value > totalPrice) {
            (bool refundSent,) = payable(msg.sender).call{ value: msg.value - totalPrice }("");
            if (!refundSent) revert EtherTransferFailed();
        }

        emit DomainRented(tokenId, msg.sender, desiredEndTimestamp, totalPrice, pricePerSecond);
    }

    /**
     * @notice Allow owner to reclaim domain after rental
     * @param tokenId Domain's ERC721 token ID
     * @dev Can only be called after rental period ends
     */
    function reclaimDomain(uint256 tokenId) external {
        RentalTerms storage terms = rentalTerms[tokenId];

        // Validate reclaim request
        if (msg.sender != terms.lender) revert NotLender();
        if (block.timestamp < terms.rentalEnd) revert ActiveRentalPeriod();

        // Return domain control
        baseRegistrar.reclaim(terms.tokenId, terms.lender);
        baseRegistrar.safeTransferFrom(address(this), terms.lender, tokenId);

        // Clean up storage
        delete rentalTerms[tokenId];

        emit DomainReclaimed(tokenId, terms.lender);
    }

    /**
     * @notice Get current pricing information
     * @param tokenId Domain's ERC721 token ID
     * @return currentPrice Current price per second
     * @return minPrice Floor price per second
     * @return timeRemainingInAuction Seconds until auction ends
     * @dev Helper function to check current auction status
     */
    function getCurrentPrice(uint256 tokenId)
        external
        view
        returns (uint256 currentPrice, uint256 minPrice, uint256 timeRemainingInAuction)
    {
        RentalTerms storage terms = rentalTerms[tokenId];

        // Return zeros for unlisted domain
        if (terms.lender == address(0)) {
            return (0, 0, 0);
        }

        // Calculate auction timing
        uint256 elapsed = block.timestamp - terms.rentalEnd;
        uint256 remaining = elapsed >= AUCTION_DURATION ? 0 : AUCTION_DURATION - elapsed;

        return (_getCurrentPrice(terms), terms.minPricePerSecond, remaining);
    }
}
