// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IENSRegistry {
    function setOwner(bytes32 node, address owner) external;
    function owner(bytes32 node) external view returns (address);
}
