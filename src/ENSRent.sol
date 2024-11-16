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
        uint256 maxDuration;
        address currentBorrower;
        uint256 rentalEnd;
        bool isActive;
    }
    
    // Mapping from tokenId to rental terms
    mapping(uint256 => RentalTerms) public rentalTerms;
    
    // Events
    event DomainListed(uint256 indexed tokenId, address indexed lender, uint256 pricePerSecond, uint256 maxDuration);
    event DomainRented(uint256 indexed tokenId, address indexed borrower, uint256 rentalEnd, uint256 totalPrice);
    event DomainReclaimed(uint256 indexed tokenId, address indexed lender);
    event RentalTermsUpdated(uint256 indexed tokenId, uint256 newPricePerSecond, uint256 newMaxDuration);
    
    constructor(address _ensNFTAddress) {
        ensNFT = IERC721(_ensNFTAddress);
    }
    
    function listDomain(
        uint256 tokenId,
        uint256 pricePerSecond,
        uint256 maxDuration
    ) external {
        require(pricePerSecond > 0, "Price must be greater than 0");
        require(maxDuration > 0, "Max duration must be greater than 0");
        
        // Transfer the ENS NFT to this contract
        ensNFT.safeTransferFrom(msg.sender, address(this), tokenId);
        
        rentalTerms[tokenId] = RentalTerms({
            lender: msg.sender,
            pricePerSecond: pricePerSecond,
            maxDuration: maxDuration,
            currentBorrower: address(0),
            rentalEnd: 0,
            isActive: true
        });
        
        emit DomainListed(tokenId, msg.sender, pricePerSecond, maxDuration);
    }
    
    function rentDomain(uint256 tokenId, uint256 duration) external payable nonReentrant {
        RentalTerms storage terms = rentalTerms[tokenId];
        require(terms.isActive, "Domain not available for rent");
        require(duration <= terms.maxDuration, "Duration exceeds maximum allowed");
        require(duration > 0, "Duration must be greater than 0");
        require(terms.currentBorrower == address(0) || block.timestamp >= terms.rentalEnd, "Domain currently rented");
        
        uint256 totalPrice = terms.pricePerSecond * duration;
        require(msg.value >= totalPrice, "Insufficient payment");
        
        // Calculate rental end time
        uint256 rentalEnd = block.timestamp + duration;
        
        // Update rental terms
        terms.currentBorrower = msg.sender;
        terms.rentalEnd = rentalEnd;
        
        // Transfer payment to lender
        payable(terms.lender).transfer(totalPrice);
        
        // Refund excess payment if any
        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }
        
        emit DomainRented(tokenId, msg.sender, rentalEnd, totalPrice);
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
        uint256 newMaxDuration
    ) external {
        RentalTerms storage terms = rentalTerms[tokenId];
        require(msg.sender == terms.lender, "Only lender can update terms");
        require(terms.currentBorrower == address(0) || block.timestamp >= terms.rentalEnd, "Active rental period");
        require(newPricePerSecond > 0, "Price must be greater than 0");
        require(newMaxDuration > 0, "Max duration must be greater than 0");
        
        terms.pricePerSecond = newPricePerSecond;
        terms.maxDuration = newMaxDuration;
        
        emit RentalTermsUpdated(tokenId, newPricePerSecond, newMaxDuration);
    }
    
    function getRentalTerms(uint256 tokenId) external view returns (
        address lender,
        uint256 pricePerSecond,
        uint256 maxDuration,
        address currentBorrower,
        uint256 rentalEnd,
        bool isActive
    ) {
        RentalTerms storage terms = rentalTerms[tokenId];
        return (
            terms.lender,
            terms.pricePerSecond,
            terms.maxDuration,
            terms.currentBorrower,
            terms.rentalEnd,
            terms.isActive
        );
    }
    
    function isAvailableForRent(uint256 tokenId) external view returns (bool) {
        RentalTerms storage terms = rentalTerms[tokenId];
        return terms.isActive && (terms.currentBorrower == address(0) || block.timestamp >= terms.rentalEnd);
    }
}