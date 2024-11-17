// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/Console.sol";
import { ENSRent } from "../src/ENSRent.sol";
import { IBaseRegistrar } from "../src/interfaces/IBaseRegistrar.sol";
import { IENSRegistry } from "../src/interfaces/IENSRegistry.sol";
import { INameWrapper } from "../src/interfaces/INameWrapper.sol";

/**
 * @title ENSRentScript
 * @notice Script for interacting with deployed ENS Rental contract
 * @dev Handles listing and renting of ENS domains
 */
contract ENSRentScript is Script {
    // Contract addresses (Sepolia)
    ENSRent public constant ensRent = ENSRent(0xBB053293241f0880844C00f519989B4f38CC2142);
    INameWrapper public constant nameWrapper = INameWrapper(0x0635513f179D50A207757E05759CbD106d7dFcE8);
    IBaseRegistrar public constant baseRegistrar = IBaseRegistrar(0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85);
    IENSRegistry public constant ensRegistry = IENSRegistry(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e);
    
    function setUp() public {
    }

    function run() public {
        // Get deployer's private key from environment
        uint256 ownerPrivateKey = vm.envUint("PRIVATE_KEY");
        address ownerAddress = vm.addr(ownerPrivateKey);

        // Get domain parameters from environment
        string memory domainName = "rent";
        uint256 minPricePerSecond = 1 gwei;
        uint256 durationInDays = 1;
        
        // Calculate domain identifiers
        uint256 tokenId = uint256(keccak256(bytes(domainName)));
        bytes32 ethNode = 0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae;
        bytes32 nameNode = keccak256(abi.encodePacked(ethNode, bytes32(tokenId)));

        console.log("Listing domain:");
        console.log("- Name:", domainName);
        console.log("- Token ID:", tokenId);
        console.log("- Owner:", ownerAddress);
        console.log("- Min price per second:", minPricePerSecond);

        vm.startBroadcast(ownerPrivateKey);

        // Approve contract to manage the domain
        if (baseRegistrar.ownerOf(tokenId) == address(nameWrapper)) {
            nameWrapper.setApprovalForAll(address(ensRent), true);
            console.log("Approved NameWrapper");
        } else {
            baseRegistrar.approve(address(ensRent), tokenId);
            console.log("Approved BaseRegistrar");
        }

        // List the domain
        ensRent.listDomain(
            tokenId,
            minPricePerSecond,
            block.timestamp + (durationInDays * 1 days),
            nameNode,
            domainName
        );

        // Log current auction details
        (uint256 currentPrice, uint256 minPrice, uint256 timeRemaining) = ensRent.getCurrentPrice(tokenId);
        console.log("\nDomain listed successfully:");
        console.log("- Current price per second:", currentPrice);
        console.log("- Minimum price per second:", minPrice);
        console.log("- Auction time remaining:", timeRemaining);

        vm.stopBroadcast();
        
        uint256 desiredEndTimestamp = block.timestamp + (durationInDays * 1 days);

        console.log("Renting domain:");
        console.log("- Name:", domainName);
        console.log("- Token ID:", tokenId);
        console.log("- Renter:", ownerAddress);
        console.log("- Duration:", durationInDays, "days");

        // Get current price and calculate payment
        (currentPrice,,) = ensRent.getCurrentPrice(tokenId);
        uint256 duration = durationInDays * 1 days;
        uint256 totalPrice = currentPrice * duration;
        uint256 paymentAmount = (totalPrice * 110) / 100; // Add 10% buffer

        console.log("- Total price (with buffer):", paymentAmount);

        vm.startBroadcast(ownerPrivateKey);

        ensRent.rentDomain{value: paymentAmount}(
            tokenId,
            desiredEndTimestamp
        );

        console.log("\nDomain rented successfully");

        vm.stopBroadcast();
    }
}
