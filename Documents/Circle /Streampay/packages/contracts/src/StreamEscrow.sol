// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StreamEscrow is Ownable {
    IERC20 public immutable usdc;

    mapping(bytes32 => uint256) public sessionSpent;
    mapping(bytes32 => uint256) public maxBudget;
    mapping(bytes32 => bool) public active;
    mapping(bytes32 => address) public sessionUser;
    mapping(bytes32 => address) public sessionAgent;

    event SessionStarted(bytes32 indexed sessionId, address indexed user, address indexed agent, uint256 budget);
    event SessionStopped(bytes32 indexed sessionId);
    event FundsWithdrawn(bytes32 indexed sessionId, uint256 amount);

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    // User deposits and starts a session
    function startSession(bytes32 sessionId, address agent, uint256 budget) external {
        require(!active[sessionId], "Session already active");
        require(budget > 0, "Budget must be > 0");

        // Transfer USDC from user to this contract
        require(usdc.transferFrom(msg.sender, address(this), budget), "Transfer failed");

        maxBudget[sessionId] = budget;
        sessionUser[sessionId] = msg.sender;
        sessionAgent[sessionId] = agent;
        active[sessionId] = true;

        emit SessionStarted(sessionId, msg.sender, agent, budget);
    }

    // Agent or Owner can withdraw spent funds up to maxBudget
    function withdraw(bytes32 sessionId, uint256 amount) external {
        require(active[sessionId], "Session inactive");
        require(msg.sender == sessionAgent[sessionId] || msg.sender == owner(), "Unauthorized");
        require(sessionSpent[sessionId] + amount <= maxBudget[sessionId], "Exceeds budget");

        sessionSpent[sessionId] += amount;

        require(usdc.transfer(msg.sender, amount), "Transfer failed");

        emit FundsWithdrawn(sessionId, amount);

        // If budget is fully consumed, deactivate session automatically
        if (sessionSpent[sessionId] == maxBudget[sessionId]) {
            active[sessionId] = false;
            emit SessionStopped(sessionId);
        }
    }

    // User or Owner can stop session
    function stopSession(bytes32 sessionId) external {
        require(active[sessionId], "Session inactive");
        require(msg.sender == sessionUser[sessionId] || msg.sender == owner(), "Unauthorized");

        active[sessionId] = false;
        
        // Refund remaining budget to user
        uint256 remaining = maxBudget[sessionId] - sessionSpent[sessionId];
        if (remaining > 0) {
            require(usdc.transfer(sessionUser[sessionId], remaining), "Refund failed");
        }

        emit SessionStopped(sessionId);
    }
}
