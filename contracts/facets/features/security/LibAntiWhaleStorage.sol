// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.18;

import "hardhat/console.sol";

library LibAntiWhaleStorage {


  struct MyStruct {
		uint256 whitelistuUSDThreshold;
		address[] whitelistedAccs;
		mapping(address => bool) whitelisted;
		bool useBlacklist;
		address[] blacklistedAccs;
		mapping(address => bool) blacklisted;
		mapping(address => bool) excludedFromMaxInvestment;
		uint256 maxuUSDInvestment;
		mapping(address => bool) excludedFromMaxTransfer;
		uint256 maxuUSDTransfer;
		uint256 minuUSDTransfer;
  }


	// define slot for this storage 
  bytes32 constant LIB_ICO_STORAGE_POSITION = keccak256("com.Catallactic.LibAntiWhaleStorage");

  function libAntiWhaleStorage() internal pure returns (MyStruct storage mystruct) {
    bytes32 position = LIB_ICO_STORAGE_POSITION;
    assembly {
      mystruct.slot := position
    }
  }

}