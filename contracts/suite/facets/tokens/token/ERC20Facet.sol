/**
 *
 *                 _ _   ______                        _
 *
 * This token is just a plain sample ERC-20 used to test the crowdsale contracts. Whereas we do not expect the final CYGAS been too different to this basic 
 * ERC-20 token, this is not the final CYGAS source code. 
 * 
 * Some things to add will be:
 *  - 3% taxes to address velocity of circulation and fund the project
 * 
 * The final features are still under discussion but, be aware that, we want to capture the natural value of the underlaying asset as more faithfully as we can 
 * and, therefore, we do not need and we do not want fancy financial artifacts eg. pool manipulations and liquifications incorporated into CYGAS. The closest 
 * to a gold standard backed by gas, the better.
 * 
 * *********************************************************************************
 * THIS TOKEN IS NOT TO BE AUDITED. IS ONLY INCLUDED FOR TEST PURPOSES.
 * *********************************************************************************
 * 
 */
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
