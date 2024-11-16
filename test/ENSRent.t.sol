// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {ENSRent} from "@src/ENSRent.sol";
import {IBaseRegistrar} from "@src/interfaces/IBaseRegistrar.sol";
import {IENSRegistry} from "@src/interfaces/IENSRegistry.sol";


contract ENSRentTest is Test {
    ENSRent public ensRent;
    IBaseRegistrar public baseRegistrar;
    IENSRegistry public ensRegistry;
    uint256 public tokenId;
    string public name;
    address public nameOwner;
    bytes32 public nameNode;

receive() external payable {}

    function setUp() public {
        vm.createSelectFork({ blockNumber: 7088658, urlOrAlias: "sepolia" });

        ensRegistry = IENSRegistry(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e);
        baseRegistrar = IBaseRegistrar(0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85);

        ensRent = new ENSRent(address(baseRegistrar), address(ensRegistry));
        name = "testinggg";
        nameOwner = address(0x76A6D08b82034b397E7e09dAe4377C18F132BbB8);

        // tokenId from keccak256(testinggg)
        tokenId = uint256(keccak256(abi.encodePacked(name)));

        // node comes from namehash(testinggg.eth)
        nameNode = bytes32(0x8dd0843bc71806ef66e05892c3d1f84c1cae43075d7d2fec5de845f41b650349);
    }

    function test_listDomain() public {
        vm.startPrank(nameOwner);

        baseRegistrar.approve(address(ensRent), tokenId);

        ensRent.listDomain(tokenId, 1, block.timestamp + 1 days, nameNode);

        vm.stopPrank();
    }

    function test_listDomain_ShouldRevert_When_MaxEndTimeExceedsExpiry() public {
        vm.startPrank(nameOwner);

        baseRegistrar.approve(address(ensRent), tokenId);

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
}
