/**
 *
 *                 _ _   ______                        _
 *	░██████╗░░█████╗░░██████╗░█████╗░██╗░░░░░██╗░█████╗░██╗░░██╗
 *	██╔════╝░██╔══██╗██╔════╝██╔══██╗██║░░░░░██║██╔══██╗██║░██╔╝
 *	██║░░██╗░███████║╚█████╗░██║░░╚═╝██║░░░░░██║██║░░╚═╝█████═╝░
 *	██║░░╚██╗██╔══██║░╚═══██╗██║░░██╗██║░░░░░██║██║░░██╗██╔═██╗░
 *	╚██████╔╝██║░░██║██████╔╝╚█████╔╝███████╗██║╚█████╔╝██║░╚██╗
 *	░╚═════╝░╚═╝░░╚═╝╚═════╝░░╚════╝░╚══════╝╚═╝░╚════╝░╚═╝░░╚═╝
 *
 * This token is just a plain sample aggregator used to test the crowdsale contracts. It represents a chainlink aggregator for testnets.
 *
 * *********************************************************************************
 * THIS TOKEN IS NOT TO BE AUDITED. IS ONLY INCLUDED FOR TEST PURPOSES.
 * *********************************************************************************
 * 
 */
// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract DemoMockAggregator is AggregatorV3Interface {

    uint80 public roundId = 0;

    int256 public price;

    uint256 public startedAt = 0;

    uint256 public updatedAt = 0;

    uint80 public answeredInRound = 0;

    function getRoundData(uint80 roundId__) external view returns (uint80 roundId_, int256 answer, uint256 startedAt_, uint256 updatedAt_, uint80 answeredInRound_) {
      return (roundId__, price, startedAt_, updatedAt_, answeredInRound_);
    }

    function latestRoundData() external view returns (uint80 roundId_, int256 answer, uint256 startedAt_, uint256 updatedAt_, uint80 answeredInRound_) {
      return (roundId, price, startedAt, updatedAt, answeredInRound);
    }

    function setDynamicPrice(int256 price_) external {
        price = price_;
    }

    function decimals() external view override returns (uint8) {}

    function description() external view override returns (string memory) {}

    function version() external view override returns (uint256) {}
}