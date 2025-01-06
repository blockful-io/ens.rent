// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Script, console } from "forge-std/Script.sol";

contract DeployConfig is Script {

    struct NetworkConfig {
        address nameWrapper;
        address baseRegistrar;
        uint256 feeBasisPoints;
    }

    uint256 public chainId;

    constructor(uint256 _chainId) {
        chainId = _chainId;
    }

    function getConfig() public view returns (NetworkConfig memory) {
        if (chainId == 1) return _getMainnetConfig();
        else return _getSepoliaConfig();
    }

    function _getMainnetConfig() private pure returns (NetworkConfig memory) {
        return NetworkConfig({
            nameWrapper: 0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401,
            baseRegistrar: 0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85,
            feeBasisPoints: 100 // 1%
         });
    }

    function _getSepoliaConfig() private pure returns (NetworkConfig memory) {
        return NetworkConfig({
            nameWrapper: 0x0635513f179D50A207757E05759CbD106d7dFcE8,
            baseRegistrar: 0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85,
            feeBasisPoints: 100 // 1%
         });
    }

}
