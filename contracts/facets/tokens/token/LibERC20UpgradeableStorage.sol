// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.18;

import "hardhat/console.sol";

library LibERC20UpgradeableStorage {

  struct MyStruct {
    mapping(address => uint256) _balances;
    mapping(address => mapping(address => uint256)) _allowances;
    uint256 _totalSupply;
    string _name;
    string _symbol;
  }

	// define slot for this storage 
  bytes32 constant LIB_ICO_STORAGE_POSITION = keccak256("com.mycompany.LibERC20UpgradeableStorage");

  function libCatallacticICOStorage() internal pure returns (MyStruct storage mystruct) {
    bytes32 position = LIB_ICO_STORAGE_POSITION;
    assembly {
      mystruct.slot := position
    }
  }

}