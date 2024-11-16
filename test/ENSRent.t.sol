// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Test, console } from "forge-std/Test.sol";
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

    receive() external payable { }

    function setUp() public {
        vm.createSelectFork({ blockNumber: 7_088_658, urlOrAlias: "sepolia" });

        nameWrapper = INameWrapper(0x0635513f179D50A207757E05759CbD106d7dFcE8);
        baseRegistrar = IBaseRegistrar(0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85);
        ensRegistry = IENSRegistry(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e);

        ensRent = new ENSRent(address(nameWrapper), address(baseRegistrar), address(ensRegistry));
        name = "setting";
        nameOwner = address(0x76A6D08b82034b397E7e09dAe4377C18F132BbB8);

        // tokenId from keccak256(testinggg)
        tokenId = uint256(keccak256(abi.encodePacked(name)));

        // node comes from namehash(testinggg.eth)
        nameNode = bytes32(keccak256(abi.encodePacked(ETH_NODE, bytes32(tokenId))));
    }

    function test_listDomain() public {
        vm.startPrank(nameOwner);

        _approveENS();

        ensRent.listDomain(tokenId, 1, block.timestamp + 1 days, nameNode);

        vm.stopPrank();
    }

    function test_listDomain_ShouldRevert_When_MaxEndTimeExceedsExpiry() public {
        vm.startPrank(nameOwner);

        _approveENS();

        vm.expectRevert(ENSRent.MaxEndTimeExceedsExpiry.selector);
        ensRent.listDomain(tokenId, 1, block.timestamp + 1000 weeks, nameNode);

        vm.stopPrank();
    }

    function test_rentDomain() public {
        test_listDomain();

        ensRent.rentDomain{ value: 1 ether }(tokenId, block.timestamp + 1 days);
    }

    function test_rentDomain_ShouldRevert_When_ExceedsMaxEndTime() public {
        test_listDomain();

        vm.expectRevert(ENSRent.ExceedsMaxEndTime.selector);
        ensRent.rentDomain{ value: 1 ether }(tokenId, block.timestamp + 100 weeks);
    }

    function _approveENS() internal {
        if (baseRegistrar.ownerOf(tokenId) == address(nameWrapper)) {
            nameWrapper.setApprovalForAll(address(ensRent), true);
        } else {
            baseRegistrar.approve(address(ensRent), tokenId);
        }
    }
}
