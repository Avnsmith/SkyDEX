// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockWETH is ERC20 {
    constructor() ERC20("Wrapped Ether (Testnet)", "WETH") {}
    function faucet(uint256 amount) external {
        require(amount <= 100 ether, "Max 100 WETH");
        _mint(msg.sender, amount);
    }
}
