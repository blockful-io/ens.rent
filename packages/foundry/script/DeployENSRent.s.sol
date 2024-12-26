// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { ScaffoldETHDeploy } from "./DeployHelpers.s.sol";
import { ENSRent } from "../contracts/ENSRent.sol";
import { DeployConfig } from "./DeployConfig.s.sol";

/**
 * @notice Deploy script for ENSRent contract
 * @dev Inherits ScaffoldETHDeploy which:
 *      - Includes forge-std/Script.sol for deployment
 *      - Includes ScaffoldEthDeployerRunner modifier
 *      - Provides `deployer` variable
 * Example:
 * npm run deploy --file DeployENSRent.s.sol  # local anvil chain
 * npm run deploy --file DeployENSRent.s.sol --network optimism # live network (requires keystore)
 */
contract DeployENSRent is ScaffoldETHDeploy {

    address public nameWrapper;
    address public baseRegistrar;
    uint256 public feeBasisPoints;

    function setUp() public {
        DeployConfig.NetworkConfig memory config = new DeployConfig(block.chainid).getConfig();
        nameWrapper = config.nameWrapper;
        baseRegistrar = config.baseRegistrar;
        feeBasisPoints = config.feeBasisPoints;
    }

    function run() external ScaffoldEthDeployerRunner {
        new ENSRent(nameWrapper, baseRegistrar, feeBasisPoints, deployer);
    }

}
