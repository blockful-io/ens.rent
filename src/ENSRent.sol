// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

import "./interfaces/IENSRegistry.sol";
import "./interfaces/IBaseRegistrar.sol";
import "./interfaces/INameWrapper.sol";

contract ENSRent is ERC721Holder, ERC1155Holder {
    IBaseRegistrar public immutable baseRegistrar;
    IENSRegistry public immutable ensRegistry;
    INameWrapper public immutable nameWrapper;

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

    constructor(address _nameWrapper, address _baseRegistrarAddress, address _ensRegistryAddress) {
        nameWrapper = INameWrapper(_nameWrapper);
        baseRegistrar = IBaseRegistrar(_baseRegistrarAddress);
        ensRegistry = IENSRegistry(_ensRegistryAddress);
    }

    function listDomain(uint256 tokenId, uint256 pricePerSecond, uint256 maxEndTimestamp, bytes32 nameNode) external {
        if (pricePerSecond == 0) revert ZeroPriceNotAllowed();
        if (maxEndTimestamp <= block.timestamp) revert MaxEndTimeMustBeFuture();
        if (maxEndTimestamp >= baseRegistrar.nameExpires(tokenId)) revert MaxEndTimeExceedsExpiry();

        if (baseRegistrar.ownerOf(tokenId) == address(nameWrapper)) {
            // ENS is wrapped
            nameWrapper.safeTransferFrom(msg.sender, address(this), uint256(nameNode), 1, "");

            nameWrapper.unwrapETH2LD(bytes32(tokenId), address(this), address(this));
        } else {
            baseRegistrar.safeTransferFrom(msg.sender, address(this), tokenId);
            baseRegistrar.reclaim(tokenId, address(this));
        }

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

        if (terms.lender == address(0)) revert DomainNotListed();
        if (desiredEndTimestamp > terms.maxEndTimestamp) revert ExceedsMaxEndTime();
        if (desiredEndTimestamp <= block.timestamp) revert EndTimeMustBeFuture();
        if (terms.currentBorrower != address(0) && block.timestamp < terms.rentalEnd) revert DomainCurrentlyRented();

        uint256 duration = desiredEndTimestamp - block.timestamp;
        uint256 totalPrice = terms.pricePerSecond * duration;
        
        if (msg.value < totalPrice) revert InsufficientPayment();

        ensRegistry.setOwner(terms.nameNode, msg.sender);

        terms.currentBorrower = msg.sender;
        terms.rentalEnd = desiredEndTimestamp;

        (bool sent,) = payable(terms.lender).call{ value: totalPrice }("");
        if (!sent) revert EtherTransferFailed();

        if (msg.value > totalPrice) {
            (bool refundSent,) = payable(msg.sender).call{ value: msg.value - totalPrice }("");
            if (!refundSent) revert EtherTransferFailed();
        }

        emit DomainRented(tokenId, msg.sender, desiredEndTimestamp, totalPrice);
    }

    function reclaimDomain(uint256 tokenId) external {
        RentalTerms storage terms = rentalTerms[tokenId];
        if (msg.sender != terms.lender) revert NotLender();
        if (block.timestamp < terms.rentalEnd) revert ActiveRentalPeriod();

        ensRegistry.setOwner(terms.nameNode, terms.lender);
        baseRegistrar.safeTransferFrom(address(this), terms.lender, tokenId);

        delete rentalTerms[tokenId];

        emit DomainReclaimed(tokenId, terms.lender);
    }

    function recoverExpiredRental(uint256 tokenId) external {
        RentalTerms storage terms = rentalTerms[tokenId];
        if (terms.lender == address(0)) revert DomainNotListed();
        if (terms.currentBorrower == address(0)) revert NoActiveRental();
        if (block.timestamp < terms.rentalEnd) revert RentalNotExpired();

        baseRegistrar.reclaim(tokenId, address(this));

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
