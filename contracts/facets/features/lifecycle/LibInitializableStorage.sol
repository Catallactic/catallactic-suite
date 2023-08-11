// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.18;

import "hardhat/console.sol";

library LibInitializableStorage {

  struct MyStruct {
    /**
     * @dev Indicates that the contract has been initialized.
     * @custom:oz-retyped-from bool
     */
    uint8 _initialized;

    /**
     * @dev Indicates that the contract is in the process of being initialized.
     */
    bool _initializing;
  }

	// define slot for this storage 
  bytes32 constant LIB_ICO_STORAGE_POSITION = keccak256("com.mycompany.LibInitializableStorage");

  function libCatallacticICOStorage() internal pure returns (MyStruct storage mystruct) {
    bytes32 position = LIB_ICO_STORAGE_POSITION;
    assembly {
      mystruct.slot := position
    }
  }

}