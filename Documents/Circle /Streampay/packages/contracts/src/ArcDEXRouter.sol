// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ArcDEXFactory.sol";
import "./ArcDEXPair.sol";

contract ArcDEXRouter {
    address public immutable factory;
    address public immutable WUSDC;

    modifier ensure(uint deadline) {
        require(deadline >= block.timestamp, "ArcDEXRouter: EXPIRED");
        _;
    }

    constructor(address _factory, address _WUSDC) {
        factory = _factory; WUSDC = _WUSDC;
    }

    function addLiquidity(
        address tokenA, address tokenB,
        uint amountADesired, uint amountBDesired,
        uint amountAMin, uint amountBMin,
        address to, uint deadline
    ) external ensure(deadline) returns (uint amountA, uint amountB, uint liquidity) {
        if (ArcDEXFactory(factory).getPair(tokenA, tokenB) == address(0))
            ArcDEXFactory(factory).createPair(tokenA, tokenB);
        (amountA, amountB) = _calcLiqAmounts(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        address pair = ArcDEXFactory(factory).getPair(tokenA, tokenB);
        _transferFrom(tokenA, msg.sender, pair, amountA);
        _transferFrom(tokenB, msg.sender, pair, amountB);
        liquidity = ArcDEXPair(pair).mint(to);
    }

    function removeLiquidity(
        address tokenA, address tokenB,
        uint liquidity, uint amountAMin, uint amountBMin,
        address to, uint deadline
    ) external ensure(deadline) returns (uint amountA, uint amountB) {
        address pair = ArcDEXFactory(factory).getPair(tokenA, tokenB);
        require(pair != address(0), "ArcDEX: PAIR_NOT_EXISTS");
        ArcDEXPair(pair).transferFrom(msg.sender, pair, liquidity);
        (uint amount0, uint amount1) = ArcDEXPair(pair).burn(to);
        (address token0,) = _sort(tokenA, tokenB);
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);
        require(amountA >= amountAMin && amountB >= amountBMin, "ArcDEXRouter: INSUFFICIENT_AMOUNT");
    }

    function swapExactTokensForTokens(
        uint amountIn, uint amountOutMin,
        address[] calldata path, address to, uint deadline
    ) external ensure(deadline) returns (uint[] memory amounts) {
        amounts = _amountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "ArcDEXRouter: INSUFFICIENT_OUTPUT");
        _transferFrom(path[0], msg.sender, ArcDEXFactory(factory).getPair(path[0], path[1]), amounts[0]);
        _swap(amounts, path, to);
    }

    function getAmountsOut(uint amountIn, address[] memory path) external view returns (uint[] memory) {
        return _amountsOut(amountIn, path);
    }

    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) public pure returns (uint) {
        uint amountInWithFee = amountIn * 997;
        return (amountInWithFee * reserveOut) / (reserveIn * 1000 + amountInWithFee);
    }

    function _swap(uint[] memory amounts, address[] memory path, address _to) internal {
        for (uint i; i < path.length - 1; i++) {
            (address t0,) = _sort(path[i], path[i+1]);
            (uint out0, uint out1) = path[i] == t0 ? (uint(0), amounts[i+1]) : (amounts[i+1], uint(0));
            address to = i < path.length - 2 ? ArcDEXFactory(factory).getPair(path[i+1], path[i+2]) : _to;
            ArcDEXPair(ArcDEXFactory(factory).getPair(path[i], path[i+1])).swap(out0, out1, to, new bytes(0));
        }
    }

    function _amountsOut(uint amountIn, address[] memory path) internal view returns (uint[] memory amounts) {
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        for (uint i; i < path.length - 1; i++) {
            address pair = ArcDEXFactory(factory).getPair(path[i], path[i+1]);
            (uint112 r0, uint112 r1,) = ArcDEXPair(pair).getReserves();
            (address t0,) = _sort(path[i], path[i+1]);
            (uint rIn, uint rOut) = path[i] == t0 ? (uint(r0), uint(r1)) : (uint(r1), uint(r0));
            amounts[i+1] = getAmountOut(amounts[i], rIn, rOut);
        }
    }

    function _calcLiqAmounts(address tokenA, address tokenB, uint aD, uint bD, uint aMin, uint bMin) internal view returns (uint, uint) {
        address pair = ArcDEXFactory(factory).getPair(tokenA, tokenB);
        if (pair == address(0)) return (aD, bD);
        (uint112 r0, uint112 r1,) = ArcDEXPair(pair).getReserves();
        if (r0 == 0 && r1 == 0) return (aD, bD);
        (address t0,) = _sort(tokenA, tokenB);
        (uint rA, uint rB) = tokenA == t0 ? (uint(r0), uint(r1)) : (uint(r1), uint(r0));
        uint bOpt = aD * rB / rA;
        if (bOpt <= bD) { require(bOpt >= bMin, "INSUF_B"); return (aD, bOpt); }
        uint aOpt = bD * rA / rB;
        require(aOpt >= aMin, "INSUF_A"); return (aOpt, bD);
    }

    function _sort(address a, address b) internal pure returns (address, address) {
        return a < b ? (a, b) : (b, a);
    }

    function _transferFrom(address token, address from, address to, uint value) internal {
        (bool s, bytes memory d) = token.call(abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, value));
        require(s && (d.length == 0 || abi.decode(d, (bool))), "TRANSFER_FROM_FAILED");
    }
}
