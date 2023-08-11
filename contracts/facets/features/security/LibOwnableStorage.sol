// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.18;

import "hardhat/console.sol";

library LibOwnableStorage {

  struct MyStruct {
    address _owner;
    address _pendingOwner;
  }

	// define slot for this storage 
  bytes32 constant LIB_ICO_STORAGE_POSITION = keccak256("com.mycompany.LibOwnableStorage");

  function libCatallacticICOStorage() internal pure returns (MyStruct storage mystruct) {
    bytes32 position = LIB_ICO_STORAGE_POSITION;
    assembly {
      mystruct.slot := position
    }
  }

}