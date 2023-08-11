// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "../../features/security/Ownable2StepUpgradeableNoStorage.sol";
import "../../features/lifecycle/InitializableNoStorage.sol";

import "../token/ERC20Facet.sol";
import "../ico/CrowdsaleFacet.sol";

contract CommonFacet is InitializableNoStorage, Ownable2StepUpgradeableNoStorage {

  function initialize() initializer public {

		console.log('**************************************************');
		console.log('*************** Initialize Common ****************');
		console.log('**************************************************');
		console.log('Owner is ', msg.sender);
    __Ownable_init();
		console.log('Owner is ', owner());

  }
	
}

