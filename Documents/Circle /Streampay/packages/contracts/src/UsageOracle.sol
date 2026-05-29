// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract UsageOracle is Ownable {
    struct Usage {
        uint256 computeSeconds;
        uint256 tokensGenerated;
        uint256 apiCalls;
        uint256 swapVolume;
        uint256 lastUpdated;
    }

    mapping(bytes32 => Usage) public sessionUsage;

    event UsageUpdated(
        bytes32 indexed sessionId,
        uint256 computeSeconds,
        uint256 tokensGenerated,
        uint256 apiCalls,
        uint256 swapVolume
    );

    constructor() Ownable(msg.sender) {}

    // Only the backend (owner) can report usage
    function updateUsage(
        bytes32 sessionId,
        uint256 computeSeconds,
        uint256 tokensGenerated,
        uint256 apiCalls,
        uint256 swapVolume
    ) external onlyOwner {
        sessionUsage[sessionId] = Usage({
            computeSeconds: computeSeconds,
            tokensGenerated: tokensGenerated,
            apiCalls: apiCalls,
            swapVolume: swapVolume,
            lastUpdated: block.timestamp
        });

        emit UsageUpdated(sessionId, computeSeconds, tokensGenerated, apiCalls, swapVolume);
    }

    function getUsage(bytes32 sessionId) external view returns (Usage memory) {
        return sessionUsage[sessionId];
    }
}
