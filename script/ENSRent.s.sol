// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Script, console } from "@forge-std/Script.sol";
import { ENSRent } from "@src/ENSRent.sol";

contract ENSRentScript is Script {
    ENSRent ensRent;

    function setUp() public { }

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.broadcast(deployerPrivateKey);
        ensRent =
            new ENSRent(0x0635513f179D50A207757E05759CbD106d7dFcE8, 0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85, 100);
    }
}
