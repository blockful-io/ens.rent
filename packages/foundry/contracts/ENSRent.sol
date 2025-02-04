// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { ERC721Holder } from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import { ERC1155Holder } from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IBaseRegistrar } from "./interfaces/IBaseRegistrar.sol";
import { INameWrapper } from "./interfaces/INameWrapper.sol";
import { IENSRent } from "./interfaces/IENSRent.sol";

/**
 * @title ENSRent
 * @author Alex Netto (@alextnetto)
 * @author Lucas Picollo (@pikonha)
 * @notice ENS domain rental contract with a fixed price per second
 * @dev Implements rental functionality for both wrapped (ERC1155) and unwrapped (ERC721) ENS names
 */
contract ENSRent is IENSRent, ERC721Holder, ERC1155Holder, Ownable {
    /**
     * @notice Fee percentage taken from rental payments
     */
    uint256 public feeBasisPoints;

    /**
     * @notice The ENS base registrar contract for managing .eth domains
     * @dev Used for handling ERC721 transfers and domain management
     */
    IBaseRegistrar public immutable baseRegistrar;

    /**
     * @notice The ENS name wrapper contract for handling wrapped domains
     * @dev Used for ERC1155 transfers and wrapped domain management
     */
    INameWrapper public immutable nameWrapper;

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
     * @notice Initialize the rental contract
     * @param _nameWrapper Address of ENS NameWrapper contract
     * @param _baseRegistrarAddress Address of ENS BaseRegistrar contract
     * @param _feeBasisPoints Fee percentage taken from rentals (100 = 1%)
     * @dev Sets up immutable contract references
     */
    constructor(address _nameWrapper, address _baseRegistrarAddress, uint256 _feeBasisPoints, address _owner)
        Ownable(_owner)
    {
        nameWrapper = INameWrapper(_nameWrapper);
        baseRegistrar = IBaseRegistrar(_baseRegistrarAddress);
        _setFeeBasisPoints(_feeBasisPoints);
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
    ) external {
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
        if (terms.currentBorrower != address(0)) {
            if (block.timestamp < terms.rentalEnd) revert DomainCurrentlyRented();
        }

        uint256 duration = desiredEndTimestamp - block.timestamp;
        uint256 totalPrice = terms.minPricePerSecond * duration;

        // Verify payment
        if (msg.value < totalPrice) revert InsufficientPayment();

        // Calculate fee
        uint256 fee = (totalPrice * feeBasisPoints) / 10_000;
        uint256 lenderPayment = totalPrice - fee;

        // Transfer domain control
        baseRegistrar.reclaim(tokenId, msg.sender);

        // Update rental terms
        terms.currentBorrower = msg.sender;
        terms.rentalEnd = desiredEndTimestamp;

        // Transfer payment to domain owner
        (bool sent,) = payable(terms.lender).call{ value: lenderPayment }("");
        if (!sent) revert EtherTransferFailed();

        // Refund excess payment
        if (msg.value > totalPrice) {
            (bool refundSent,) = payable(msg.sender).call{ value: msg.value - totalPrice }("");
            if (!refundSent) revert EtherTransferFailed();
        }

        emit DomainRented(tokenId, msg.sender, desiredEndTimestamp, totalPrice, terms.minPricePerSecond);
    }

    /**
     * @notice Returns the ownership to the Rent contract to be rented again
     * @param tokenId Domain's ERC721 token ID
     */
    function handleRentalEnd(uint256 tokenId) external {
        RentalTerms storage terms = rentalTerms[tokenId];

        if (terms.lender == address(0) || block.timestamp > terms.maxEndTimestamp) revert DomainNotListed();
        if (block.timestamp < terms.rentalEnd) revert DomainCurrentlyRented();

        baseRegistrar.reclaim(tokenId, address(this));
        terms.currentBorrower = address(0);
        terms.rentalEnd = 0;
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
        if (block.timestamp < terms.rentalEnd) revert DomainCurrentlyRented();

        // Return domain control
        baseRegistrar.reclaim(terms.tokenId, terms.lender);
        baseRegistrar.safeTransferFrom(address(this), terms.lender, tokenId);

        // Clean up storage
        delete rentalTerms[tokenId];

        emit DomainReclaimed(tokenId, terms.lender);
    }

    /**
     * @notice Update the fee percentage taken from rentals
     * @param _feeBasisPoints New fee in basis points
     * @dev Can only be called by contract owner
     */
    function setFeeBasisPoints(uint256 _feeBasisPoints) external onlyOwner {
        _setFeeBasisPoints(_feeBasisPoints);
    }

    /**
     * @notice Internal function to validate and set fee basis points
     * @param _feeBasisPoints New fee in basis points
     */
    function _setFeeBasisPoints(uint256 _feeBasisPoints) private {
        require(_feeBasisPoints <= 1000, "Fee cannot exceed 10%");
        feeBasisPoints = _feeBasisPoints;
    }

    receive() external payable { }

    function withdraw() external onlyOwner {
        (bool sent,) = payable(owner()).call{ value: address(this).balance }("");
        if (!sent) revert EtherTransferFailed();
    }
}
