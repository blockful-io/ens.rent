// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/ENSRent.sol";

/**
 * @notice Deploy script for YourContract contract
 * @dev Inherits ScaffoldETHDeploy which:
 *      - Includes forge-std/Script.sol for deployment
 *      - Includes ScaffoldEthDeployerRunner modifier
 *      - Provides `deployer` variable
 * Example:
 * npm run deploy --file DeployYourContract.s.sol  # local anvil chain
 * npm run deploy --file DeployYourContract.s.sol --network optimism # live network (requires keystore)
 */
contract DeployYourContract is ScaffoldETHDeploy {

    function run() external ScaffoldEthDeployerRunner {
        new ENSRent(
            0x0635513f179D50A207757E05759CbD106d7dFcE8, // nameWrapper
            0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85, // baseRegistrarAddress
            100, // feeBasisPoints
            deployer
        );
    }

}
