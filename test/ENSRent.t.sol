// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Test, console } from "@forge-std/Test.sol";

import { ENSRent } from "@src/ENSRent.sol";
import { IENSRent } from "@src/interfaces/IENSRent.sol";
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

        ensRent = new ENSRent(address(nameWrapper), address(baseRegistrar));
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
        ensRent.listDomain(tokenId, 1 wei, block.timestamp + 1 days, nameNode, name);
        vm.stopPrank();

        (address lender,,,,, bytes32 node,) = ensRent.rentalTerms(tokenId);
        assertEq(lender, nameOwner);
        assertEq(node, nameNode);
    }

    function test_listDomain_ShouldRevert_When_ZeroPrice() public {
        vm.startPrank(nameOwner);
        _approveENS();

        vm.expectRevert(IENSRent.ZeroPriceNotAllowed.selector);
        ensRent.listDomain(tokenId, 0, block.timestamp + 1 days, nameNode, name);
        vm.stopPrank();
    }

    function test_listDomain_ShouldRevert_When_PastTimestamp() public {
        vm.startPrank(nameOwner);
        _approveENS();

        vm.expectRevert(IENSRent.MaxEndTimeMustBeFuture.selector);
        ensRent.listDomain(tokenId, 1, block.timestamp - 1, nameNode, name);
        vm.stopPrank();
    }

    function test_listDomain_ShouldRevert_When_MaxEndTimeExceedsExpiry() public {
        vm.startPrank(nameOwner);
        _approveENS();

        vm.expectRevert(IENSRent.MaxEndTimeExceedsExpiry.selector);
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

    function test_rentDomainTwice() public {
        test_listDomain();

        vm.deal(RANDOM_USER, 2 ether);
        vm.prank(RANDOM_USER);
        ensRent.rentDomain{ value: 1 ether }(tokenId, block.timestamp + 30 minutes);

        vm.warp(block.timestamp + 40 minutes);

        vm.prank(RENTER);
        ensRent.rentDomain{ value: 1 ether }(tokenId, block.timestamp + 1 hours);

        (,,, address borrower, uint256 rentalEnd,,) = ensRent.rentalTerms(tokenId);
        assertEq(borrower, RENTER);
        assertEq(rentalEnd, block.timestamp + 1 hours);
    }

    function test_slightlyLessPayment() public {
        vm.startPrank(nameOwner);
        _approveENS();
        ensRent.listDomain(tokenId, 10 wei, block.timestamp + 1 days, nameNode, name);
        vm.stopPrank();

        vm.expectRevert(IENSRent.InsufficientPayment.selector);

        vm.prank(RENTER);
        ensRent.rentDomain{ value: 9 wei }(tokenId, block.timestamp + 1 days);
    }

    function test_slightlyMorePayment() public {
        vm.startPrank(nameOwner);
        _approveENS();
        ensRent.listDomain(tokenId, 10 wei, block.timestamp + 1 days, nameNode, name);
        vm.stopPrank();

        uint256 initialBalance = RENTER.balance;
        uint256 value = 10 wei * 60 + 10 wei; // price * duration + additional 10 wei
        vm.prank(RENTER);
        ensRent.rentDomain{ value: value }(tokenId, block.timestamp + 60 seconds);

        uint256 finalBalance = RENTER.balance;
        assertGt(finalBalance, initialBalance - value); // Should have received some refund
        vm.stopPrank();
    }

    function test_rentDomain_ShouldRevert_When_NotListed() public {
        vm.startPrank(RENTER);
        vm.expectRevert(IENSRent.DomainNotListed.selector);
        ensRent.rentDomain{ value: 1 ether }(tokenId, block.timestamp + 1 days);
        vm.stopPrank();
    }

    function test_rentDomain_ShouldRevert_When_InsufficientPayment() public {
        test_listDomain();

        vm.startPrank(RENTER);
        vm.expectRevert(IENSRent.InsufficientPayment.selector);
        ensRent.rentDomain{ value: 0 }(tokenId, block.timestamp + 1 days);
        vm.stopPrank();
    }

    function test_rentDomain_ShouldRevert_When_AlreadyRented() public {
        test_listDomain();

        vm.startPrank(RENTER);
        ensRent.rentDomain{ value: 1 ether }(tokenId, block.timestamp + 1 days);

        vm.expectRevert(IENSRent.DomainCurrentlyRented.selector);
        ensRent.rentDomain{ value: 1 ether }(tokenId, block.timestamp + 1 days);
        vm.stopPrank();
    }

    function test_handleRentalEnd_AfterMaxRental() public {
        test_listDomain();

        vm.deal(RANDOM_USER, 2 ether);
        vm.prank(RANDOM_USER);
        ensRent.rentDomain{ value: 1 ether }(tokenId, block.timestamp + 30 minutes);

        vm.warp(block.timestamp + 1 weeks);

        vm.expectRevert(IENSRent.DomainNotListed.selector);
        ensRent.handleRentalEnd(tokenId);
    }

    function test_handleRentalEnd_AfterRentalEnd() public {
        test_listDomain();

        vm.deal(RANDOM_USER, 2 ether);
        vm.prank(RANDOM_USER);
        ensRent.rentDomain{ value: 1 ether }(tokenId, block.timestamp + 30 minutes);

        // end of 1st rental but before end of listing
        vm.warp(block.timestamp + 40 minutes);

        ensRent.handleRentalEnd(tokenId);

        (,,, address borrower,,,) = ensRent.rentalTerms(tokenId);
        assertEq(borrower, address(0));
    }

    function test_handleRentalEnd_BeforeRentalEnd() public {
        test_listDomain();

        vm.prank(RENTER);
        ensRent.rentDomain{ value: 1 ether }(tokenId, block.timestamp + 30 minutes);

        vm.expectRevert(IENSRent.DomainCurrentlyRented.selector);
        ensRent.handleRentalEnd(tokenId);

        (,,, address borrower,,,) = ensRent.rentalTerms(tokenId);
        assertEq(borrower, RENTER);
    }

    function test_rentDomain_ShouldRevert_When_PastEndTime() public {
        test_listDomain();

        vm.startPrank(RENTER);
        vm.expectRevert(IENSRent.EndTimeMustBeFuture.selector);
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
        vm.expectRevert(IENSRent.NotLender.selector);
        ensRent.reclaimDomain(tokenId);
        vm.stopPrank();
    }

    function test_reclaimDomain_ShouldRevert_When_ActiveRental() public {
        test_rentDomain();

        vm.startPrank(nameOwner);
        vm.expectRevert(IENSRent.DomainCurrentlyRented.selector);
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
