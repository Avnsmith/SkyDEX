// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "./ArcDEXPair.sol";

contract ArcDEXFactory {
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;
    event PairCreated(address indexed token0, address indexed token1, address pair, uint);

    function allPairsLength() external view returns (uint) { return allPairs.length; }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "ArcDEX: IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "ArcDEX: ZERO_ADDRESS");
        require(getPair[token0][token1] == address(0), "ArcDEX: PAIR_EXISTS");
        bytes memory bytecode = type(ArcDEXPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly { pair := create2(0, add(bytecode, 32), mload(bytecode), salt) }
        ArcDEXPair(pair).initialize(token0, token1);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }
}
