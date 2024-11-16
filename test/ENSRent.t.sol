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

    function setUp() public {
        vm.createSelectFork({ blockNumber: 7088658, urlOrAlias: "sepolia" });

        ensRegistry = IENSRegistry(0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85);
        baseRegistrar = IBaseRegistrar(0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85);

        ensRent = new ENSRent(address(baseRegistrar), address(ensRegistry));
        name = "testinggg";
        nameOwner = address(0x76A6D08b82034b397E7e09dAe4377C18F132BbB8);

         // calculate tokenId from name
        nameNode = keccak256(abi.encodePacked(name));
        tokenId = uint256(nameNode);
    }

    function test_listDomain() public {

        vm.startPrank(nameOwner);
        baseRegistrar.approve(address(ensRent), tokenId);

        ensRent.listDomain(tokenId, 1, block.timestamp + 1 days, nameNode);
        vm.stopPrank();
    }
}
