// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "../../features/security/Ownable2StepUpgradeableNoStorage.sol";
import "./ERC20UpgradeableNoStorage.sol";

import "hardhat/console.sol";

contract ERC20Facet is ERC20UpgradeableNoStorage, Ownable2StepUpgradeableNoStorage { 

	// will execute only once
  function initialize(string memory name_, string memory symbol_, uint256 supply_) public initializer {
		
    __Ownable_init();
		
    __ERC20_init(name_, symbol_);
    _mint(msg.sender, supply_);
  }
	
}
