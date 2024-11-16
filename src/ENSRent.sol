// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IENSRegistry {
    function setOwner(bytes32 node, address owner) external;
    function owner(bytes32 node) external view returns (address);
}

contract ENSRental is ERC721Holder, ReentrancyGuard, Ownable {
    IERC721 public immutable ensNFT;
    IENSRegistry public immutable ensRegistry;
    
    struct RentalTerms {
        address lender;
        uint256 pricePerSecond;
        uint256 maxEndTimestamp;
        address currentBorrower;
        uint256 rentalEnd;
        bool isActive;
        bytes32 nameNode;
    }
    
    mapping(uint256 => RentalTerms) public rentalTerms;
    
    event DomainListed(uint256 indexed tokenId, address indexed lender, uint256 pricePerSecond, uint256 maxEndTimestamp, bytes32 nameNode);
    event DomainRented(uint256 indexed tokenId, address indexed borrower, uint256 rentalEnd, uint256 totalPrice);
    event DomainReclaimed(uint256 indexed tokenId, address indexed lender);
    
    error EtherTransferFailed();
    
    constructor(address _ensNFTAddress, address _ensRegistryAddress) {
        ensNFT = IERC721(_ensNFTAddress);
        ensRegistry = IENSRegistry(_ensRegistryAddress);
    }
    
    function listDomain(
        uint256 tokenId,
        uint256 pricePerSecond,
        uint256 maxEndTimestamp,
        bytes32 nameNode
    ) external {
        require(pricePerSecond > 0, "Price must be greater than 0");
        require(maxEndTimestamp > block.timestamp, "Max end time must be in the future");
        
        ensNFT.safeTransferFrom(msg.sender, address(this), tokenId);
        ensRegistry.setOwner(nameNode, address(this));
        
        rentalTerms[tokenId] = RentalTerms({
            lender: msg.sender,
            pricePerSecond: pricePerSecond,
            maxEndTimestamp: maxEndTimestamp,
            currentBorrower: address(0),
            rentalEnd: 0,
            isActive: true,
            nameNode: nameNode
        });
        
        emit DomainListed(tokenId, msg.sender, pricePerSecond, maxEndTimestamp, nameNode);
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
        
        ensRegistry.setOwner(terms.nameNode, msg.sender);
        
        terms.currentBorrower = msg.sender;
        terms.rentalEnd = desiredEndTimestamp;
        
        // Transfer payment to lender
        (bool sent,) = payable(terms.lender).call{value: totalPrice}("");
        if (!sent) revert EtherTransferFailed();
        
        // Refund excess payment if any
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
        
        terms.isActive = false;
        terms.currentBorrower = address(0);
        terms.rentalEnd = 0;
        
        emit DomainReclaimed(tokenId, terms.lender);
    }
    
    function recoverExpiredRental(uint256 tokenId) external {
        RentalTerms storage terms = rentalTerms[tokenId];
        require(terms.isActive, "Domain not listed");
        require(terms.currentBorrower != address(0), "No active rental");
        require(block.timestamp >= terms.rentalEnd, "Rental not expired");
        
        ensRegistry.setOwner(terms.nameNode, address(this));
        
        terms.currentBorrower = address(0);
        terms.rentalEnd = 0;
    }
    
    
    function getRentalTerms(uint256 tokenId) external view returns (
        address lender,
        uint256 pricePerSecond,
        uint256 maxEndTimestamp,
        address currentBorrower,
        uint256 rentalEnd,
        bool isActive,
        bytes32 nameNode
    ) {
        RentalTerms storage terms = rentalTerms[tokenId];
        return (
            terms.lender,
            terms.pricePerSecond,
            terms.maxEndTimestamp,
            terms.currentBorrower,
            terms.rentalEnd,
            terms.isActive,
            terms.nameNode
        );
    }

}