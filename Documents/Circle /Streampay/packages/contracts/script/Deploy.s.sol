// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "forge-std/Script.sol";
import "../src/ArcDEXFactory.sol";
import "../src/ArcDEXRouter.sol";
import "../src/MockWETH.sol";
import "../src/StreamEscrow.sol";
import "../src/UsageOracle.sol";

contract DeployArcDEX is Script {
    address constant USDC = 0x3600000000000000000000000000000000000000;
    address constant EURC = 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        MockWETH weth = new MockWETH();
        ArcDEXFactory factory = new ArcDEXFactory();
        ArcDEXRouter router = new ArcDEXRouter(address(factory), address(weth));

        factory.createPair(USDC, address(weth));   // USDC/WETH pair
        factory.createPair(USDC, EURC);             // USDC/EURC pair
        
        StreamEscrow escrow = new StreamEscrow(USDC);
        UsageOracle oracle = new UsageOracle();

        vm.stopBroadcast();

        console.log("=== DEPLOYMENT ===");
        console.log("MockWETH:", address(weth));
        console.log("Factory: ", address(factory));
        console.log("Router:  ", address(router));
        console.log("USDC/WETH:", factory.getPair(USDC, address(weth)));
        console.log("USDC/EURC:", factory.getPair(USDC, EURC));
        console.log("StreamEscrow:", address(escrow));
        console.log("UsageOracle:", address(oracle));
        console.log("Explorer: https://testnet.arcscan.app");
    }
}
