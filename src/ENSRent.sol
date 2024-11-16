// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ENSRental is ERC721Holder, ReentrancyGuard, Ownable {
    // ENS NFT contract address
    IERC721 public immutable ensNFT;
    
    struct RentalTerms {
        address lender;
        uint256 pricePerSecond;
        uint256 maxEndTimestamp;  // The maximum timestamp until which the domain can be rented
        address currentBorrower;
        uint256 rentalEnd;
        bool isActive;
    }
    
    // Mapping from tokenId to rental terms
    mapping(uint256 => RentalTerms) public rentalTerms;
    
    // Events
    event DomainListed(uint256 indexed tokenId, address indexed lender, uint256 pricePerSecond, uint256 maxEndTimestamp);
    event DomainRented(uint256 indexed tokenId, address indexed borrower, uint256 rentalEnd, uint256 totalPrice);
    event DomainReclaimed(uint256 indexed tokenId, address indexed lender);
    event RentalTermsUpdated(uint256 indexed tokenId, uint256 newPricePerSecond, uint256 newMaxEndTimestamp);
    
    constructor(address _ensNFTAddress) {
        ensNFT = IERC721(_ensNFTAddress);
    }
    
    function listDomain(
        uint256 tokenId,
        uint256 pricePerSecond,
        uint256 maxEndTimestamp
    ) external {
        require(pricePerSecond > 0, "Price must be greater than 0");
        require(maxEndTimestamp > block.timestamp, "Max end time must be in the future");
        
        // Transfer the ENS NFT to this contract
        ensNFT.safeTransferFrom(msg.sender, address(this), tokenId);
        
        rentalTerms[tokenId] = RentalTerms({
            lender: msg.sender,
            pricePerSecond: pricePerSecond,
            maxEndTimestamp: maxEndTimestamp,
            currentBorrower: address(0),
            rentalEnd: 0,
            isActive: true
        });
        
        emit DomainListed(tokenId, msg.sender, pricePerSecond, maxEndTimestamp);
    }
    
    function rentDomain(uint256 tokenId, uint256 desiredEndTimestamp) external payable nonReentrant {
        RentalTerms storage terms = rentalTerms[tokenId];
        require(terms.isActive, "Domain not available for rent");
        require(desiredEndTimestamp <= terms.maxEndTimestamp, "Requested end time exceeds maximum allowed");
        require(desiredEndTimestamp > block.timestamp, "End time must be in the future");
        require(terms.currentBorrower == address(0) || block.timestamp >= terms.rentalEnd, "Domain currently rented");
        
        uint256 duration = desiredEndTimestamp - block.timestamp;
        uint256 totalPrice = terms.pricePerSecond * duration;
        require(msg.value >= totalPrice, "Insufficient payment");
        
        // Update rental terms
        terms.currentBorrower = msg.sender;
        terms.rentalEnd = desiredEndTimestamp;
        
        // Transfer payment to lender
        payable(terms.lender).transfer(totalPrice);
        
        // Refund excess payment if any
        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }
        
        emit DomainRented(tokenId, msg.sender, desiredEndTimestamp, totalPrice);
    }
    
    function reclaimDomain(uint256 tokenId) external {
        RentalTerms storage terms = rentalTerms[tokenId];
        require(msg.sender == terms.lender, "Only lender can reclaim");
        require(block.timestamp >= terms.rentalEnd, "Active rental period");
        
        // Transfer ENS NFT back to lender
        ensNFT.safeTransferFrom(address(this), terms.lender, tokenId);
        
        // Reset rental terms
        terms.isActive = false;
        terms.currentBorrower = address(0);
        terms.rentalEnd = 0;
        
        emit DomainReclaimed(tokenId, terms.lender);
    }
    
    function updateRentalTerms(
        uint256 tokenId,
        uint256 newPricePerSecond,
        uint256 newMaxEndTimestamp
    ) external {
        RentalTerms storage terms = rentalTerms[tokenId];
        require(msg.sender == terms.lender, "Only lender can update terms");
        require(terms.currentBorrower == address(0) || block.timestamp >= terms.rentalEnd, "Active rental period");
        require(newPricePerSecond > 0, "Price must be greater than 0");
        require(newMaxEndTimestamp > block.timestamp, "Max end time must be in the future");
        
        terms.pricePerSecond = newPricePerSecond;
        terms.maxEndTimestamp = newMaxEndTimestamp;
        
        emit RentalTermsUpdated(tokenId, newPricePerSecond, newMaxEndTimestamp);
    }
    
    function getRentalTerms(uint256 tokenId) external view returns (
        address lender,
        uint256 pricePerSecond,
        uint256 maxEndTimestamp,
        address currentBorrower,
        uint256 rentalEnd,
        bool isActive
    ) {
        RentalTerms storage terms = rentalTerms[tokenId];
        return (
            terms.lender,
            terms.pricePerSecond,
            terms.maxEndTimestamp,
            terms.currentBorrower,
            terms.rentalEnd,
            terms.isActive
        );
    }
    
    function isAvailableForRent(uint256 tokenId) external view returns (bool) {
        RentalTerms storage terms = rentalTerms[tokenId];
        return terms.isActive && 
               (terms.currentBorrower == address(0) || block.timestamp >= terms.rentalEnd) &&
               block.timestamp < terms.maxEndTimestamp;
    }
}