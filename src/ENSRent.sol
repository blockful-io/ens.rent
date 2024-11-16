// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

import "./interfaces/IENSRegistry.sol";
import "./interfaces/IBaseRegistrar.sol";

contract ENSRent is ERC721Holder {
    IBaseRegistrar public immutable ensNFT;
    IENSRegistry public immutable ensRegistry;

    struct RentalTerms {
        address lender;
        uint256 pricePerSecond;
        uint256 maxEndTimestamp;
        address currentBorrower;
        uint256 rentalEnd;
        bytes32 nameNode;
    }

    mapping(uint256 => RentalTerms) public rentalTerms;

    event DomainListed(
        uint256 indexed tokenId,
        address indexed lender,
        uint256 pricePerSecond,
        uint256 maxEndTimestamp,
        bytes32 nameNode
    );
    event DomainRented(uint256 indexed tokenId, address indexed borrower, uint256 rentalEnd, uint256 totalPrice);
    event DomainReclaimed(uint256 indexed tokenId, address indexed lender);
    event RentalTermsUpdated(uint256 indexed tokenId, uint256 newPricePerSecond, uint256 newMaxEndTimestamp);

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

    constructor(address _ensNFTAddress, address _ensRegistryAddress) {
        ensNFT = IBaseRegistrar(_ensNFTAddress);
        ensRegistry = IENSRegistry(_ensRegistryAddress);
    }

    function listDomain(uint256 tokenId, uint256 pricePerSecond, uint256 maxEndTimestamp, bytes32 nameNode) external {
        require(pricePerSecond > 0, "Price must be greater than 0");
        require(maxEndTimestamp > block.timestamp, "Max end time must be in the future");
        require(maxEndTimestamp < ensNFT.nameExpires(tokenId), "Max end time must be after name expires");

        ensNFT.safeTransferFrom(msg.sender, address(this), tokenId);
        ensNFT.reclaim(tokenId, address(this));

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

    function rentDomain(uint256 tokenId, uint256 desiredEndTimestamp) external payable {
        RentalTerms storage terms = rentalTerms[tokenId];
        require(terms.lender != address(0), "Domain not listed");
        require(desiredEndTimestamp <= terms.maxEndTimestamp, "Requested end time exceeds maximum allowed");
        require(desiredEndTimestamp > block.timestamp, "End time must be in the future");
        require(terms.currentBorrower == address(0) || block.timestamp >= terms.rentalEnd, "Domain currently rented");

        uint256 duration = desiredEndTimestamp - block.timestamp;
        uint256 totalPrice = terms.pricePerSecond * duration;
        require(msg.value >= totalPrice, "Insufficient payment");

        ensRegistry.setOwner(terms.nameNode, msg.sender);

        terms.currentBorrower = msg.sender;
        terms.rentalEnd = desiredEndTimestamp;

        (bool sent,) = payable(terms.lender).call{value: totalPrice}("");
        if (!sent) revert EtherTransferFailed();

        if (msg.value > totalPrice) {
            (bool refundSent,) = payable(msg.sender).call{value: msg.value - totalPrice}("");
            if (!refundSent) revert EtherTransferFailed();
        }

        emit DomainRented(tokenId, msg.sender, desiredEndTimestamp, totalPrice);
    }

    function reclaimDomain(uint256 tokenId) external {
        RentalTerms storage terms = rentalTerms[tokenId];
        require(msg.sender == terms.lender, "Only lender can reclaim");
        require(block.timestamp >= terms.rentalEnd, "Active rental period");

        ensRegistry.setOwner(terms.nameNode, terms.lender);
        ensNFT.safeTransferFrom(address(this), terms.lender, tokenId);

        delete rentalTerms[tokenId];

        emit DomainReclaimed(tokenId, terms.lender);
    }

    function recoverExpiredRental(uint256 tokenId) external {
        RentalTerms storage terms = rentalTerms[tokenId];
        require(terms.lender != address(0), "Domain not listed");
        require(terms.currentBorrower != address(0), "No active rental");
        require(block.timestamp >= terms.rentalEnd, "Rental not expired");

        ensNFT.reclaim(tokenId, address(this));

        terms.currentBorrower = address(0);
        terms.rentalEnd = 0;
    }

    function getRentalTerms(uint256 tokenId)
        external
        view
        returns (
            address lender,
            uint256 pricePerSecond,
            uint256 maxEndTimestamp,
            address currentBorrower,
            uint256 rentalEnd,
            bytes32 nameNode
        )
    {
        RentalTerms storage terms = rentalTerms[tokenId];
        return (
            terms.lender,
            terms.pricePerSecond,
            terms.maxEndTimestamp,
            terms.currentBorrower,
            terms.rentalEnd,
            terms.nameNode
        );
    }
}
