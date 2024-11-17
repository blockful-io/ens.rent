// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Test, console } from "@forge-std/Test.sol";
import { ENSRent } from "@src/ENSRent.sol";
import { IBaseRegistrar } from "@src/interfaces/IBaseRegistrar.sol";
import { IENSRegistry } from "@src/interfaces/IENSRegistry.sol";
import { INameWrapper } from "@src/interfaces/INameWrapper.sol";

contract ENSRentTest is Test {
    ENSRent public ensRent;
    IBaseRegistrar public baseRegistrar;
    IENSRegistry public ensRegistry;
    INameWrapper public nameWrapper;

    uint256 public tokenId;
    string public name;
    address public nameOwner;
    bytes32 public nameNode;
    bytes32 public ETH_NODE = keccak256(abi.encodePacked(bytes32(0), keccak256("eth")));

    // Test addresses
    address public constant RENTER = address(0x1);
    address public constant RANDOM_USER = address(0x2);

    receive() external payable { }

    function setUp() public {
        vm.createSelectFork({ blockNumber: 7_088_658, urlOrAlias: "sepolia" });

        nameWrapper = INameWrapper(0x0635513f179D50A207757E05759CbD106d7dFcE8);
        baseRegistrar = IBaseRegistrar(0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85);
        ensRegistry = IENSRegistry(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e);

        ensRent = new ENSRent(address(nameWrapper), address(baseRegistrar), address(ensRegistry));
        name = "testinggg";
        nameOwner = address(0x76A6D08b82034b397E7e09dAe4377C18F132BbB8);

        tokenId = uint256(keccak256(abi.encodePacked(name)));
        nameNode = bytes32(keccak256(abi.encodePacked(ETH_NODE, bytes32(tokenId))));

        // Fund test addresses
        vm.deal(RENTER, 100 ether);
    }

    // Listing Tests
    function test_listDomain() public {
        vm.startPrank(nameOwner);
        _approveENS();
        ensRent.listDomain(tokenId, 1, block.timestamp + 1 days, nameNode, name);
        vm.stopPrank();

        (address lender,,,,, bytes32 node,) = ensRent.rentalTerms(tokenId);
        assertEq(lender, nameOwner);
        assertEq(node, nameNode);
    }

    function test_listDomain_ShouldRevert_When_ZeroPrice() public {
        vm.startPrank(nameOwner);
        _approveENS();
        
        vm.expectRevert(ENSRent.ZeroPriceNotAllowed.selector);
        ensRent.listDomain(tokenId, 0, block.timestamp + 1 days, nameNode, name);
        vm.stopPrank();
    }

    function test_listDomain_ShouldRevert_When_PastTimestamp() public {
        vm.startPrank(nameOwner);
        _approveENS();
        
        vm.expectRevert(ENSRent.MaxEndTimeMustBeFuture.selector);
        ensRent.listDomain(tokenId, 1, block.timestamp - 1, nameNode, name);
        vm.stopPrank();
    }

    function test_listDomain_ShouldRevert_When_MaxEndTimeExceedsExpiry() public {
        vm.startPrank(nameOwner);
        _approveENS();
        
        vm.expectRevert(ENSRent.MaxEndTimeExceedsExpiry.selector);
        ensRent.listDomain(tokenId, 1, block.timestamp + 1000 weeks, nameNode, name);
        vm.stopPrank();
    }

    function test_listDomain_ShouldRevert_When_NotOwner() public {
        vm.startPrank(RANDOM_USER);
        
        vm.expectRevert("ERC721: caller is not token owner or approved");
        ensRent.listDomain(tokenId, 1, block.timestamp + 1 days, nameNode, name);
        vm.stopPrank();
    }

    // Rental Tests
    function test_rentDomain() public {
        test_listDomain();

        vm.startPrank(RENTER);
        uint256 endTime = block.timestamp + 1 days;
        ensRent.rentDomain{ value: 1 ether }(tokenId, endTime);

        (,, uint256 maxEnd, address borrower, uint256 rentalEnd,,) = ensRent.rentalTerms(tokenId);
        assertEq(borrower, RENTER);
        assertEq(rentalEnd, endTime);
        assertLe(endTime, maxEnd);
        vm.stopPrank();
    }

    function test_rentDomain_ShouldRevert_When_NotListed() public {
        vm.startPrank(RENTER);
        vm.expectRevert(ENSRent.DomainNotListed.selector);
        ensRent.rentDomain{ value: 1 ether }(tokenId, block.timestamp + 1 days);
        vm.stopPrank();
    }

    function test_rentDomain_ShouldRevert_When_InsufficientPayment() public {
        test_listDomain();

        vm.startPrank(RENTER);
        vm.expectRevert(ENSRent.InsufficientPayment.selector);
        ensRent.rentDomain{ value: 0 }(tokenId, block.timestamp + 1 days);
        vm.stopPrank();
    }

    function test_rentDomain_ShouldRevert_When_AlreadyRented() public {
        test_listDomain();
        
        vm.startPrank(RENTER);
        ensRent.rentDomain{ value: 1 ether }(tokenId, block.timestamp + 1 days);
        
        vm.expectRevert(ENSRent.DomainCurrentlyRented.selector);
        ensRent.rentDomain{ value: 1 ether }(tokenId, block.timestamp + 1 days);
        vm.stopPrank();
    }

    function test_rentDomain_ShouldRevert_When_PastEndTime() public {
        test_listDomain();

        vm.startPrank(RENTER);
        vm.expectRevert(ENSRent.EndTimeMustBeFuture.selector);
        ensRent.rentDomain{ value: 1 ether }(tokenId, block.timestamp - 1);
        vm.stopPrank();
    }

    // Reclaim Tests
    function test_reclaimDomain() public {
        test_rentDomain();
        
        // Fast forward past rental period
        vm.warp(block.timestamp + 2 days);
        
        vm.startPrank(nameOwner);
        ensRent.reclaimDomain(tokenId);
        
        (address lender,,,,,,) = ensRent.rentalTerms(tokenId);
        assertEq(lender, address(0)); // Terms should be deleted
        vm.stopPrank();
    }

    function test_reclaimDomain_ShouldRevert_When_NotLender() public {
        test_rentDomain();
        
        vm.warp(block.timestamp + 2 days);
        
        vm.startPrank(RANDOM_USER);
        vm.expectRevert(ENSRent.NotLender.selector);
        ensRent.reclaimDomain(tokenId);
        vm.stopPrank();
    }

    function test_reclaimDomain_ShouldRevert_When_ActiveRental() public {
        test_rentDomain();
        
        vm.startPrank(nameOwner);
        vm.expectRevert(ENSRent.ActiveRentalPeriod.selector);
        ensRent.reclaimDomain(tokenId);
        vm.stopPrank();
    }

    // Payment Tests
    function test_rentDomain_ShouldRefundExcessPayment() public {
        test_listDomain();
        
        vm.startPrank(RENTER);
        uint256 initialBalance = RENTER.balance;
        uint256 rentPayment = 2 ether;
        
        ensRent.rentDomain{ value: rentPayment }(tokenId, block.timestamp + 1 days);
        
        uint256 finalBalance = RENTER.balance;
        assertGt(finalBalance, initialBalance - rentPayment); // Should have received some refund
        vm.stopPrank();
    }

    // Name Control Tests
    function test_rentDomain_ShouldTransferENSControl() public {
        test_listDomain();
        
        vm.startPrank(RENTER);
        ensRent.rentDomain{ value: 1 ether }(tokenId, block.timestamp + 1 days);
        
        address currentOwner = ensRegistry.owner(nameNode);
        assertEq(currentOwner, RENTER);
        vm.stopPrank();
    }

    function test_reclaimDomain_ShouldReturnENSControl() public {
        test_rentDomain();
        
        vm.warp(block.timestamp + 2 days);
        
        vm.startPrank(nameOwner);
        ensRent.reclaimDomain(tokenId);
        
        address currentOwner = ensRegistry.owner(nameNode);
        assertEq(currentOwner, nameOwner);
        vm.stopPrank();
    }

    // Helper functions
    function _approveENS() internal {
        if (baseRegistrar.ownerOf(tokenId) == address(nameWrapper)) {
            nameWrapper.setApprovalForAll(address(ensRent), true);
        } else {
            baseRegistrar.approve(address(ensRent), tokenId);
        }
    }
}