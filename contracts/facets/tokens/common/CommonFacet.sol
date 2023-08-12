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
		//o._owner = msg.sender;
		console.log('Owner is ', owner());

		s.hardCapuUSD = 300_000_000_000;
		s.softCapuUSD = 50_000_000_000;

		s.whitelistuUSDThreshold = 1_000_000_000;
		s.maxuUSDInvestment = 100_000_000_000;
		s.maxuUSDTransfer = 100_000_000_000;
		s.minuUSDTransfer = 9_999_999;

		console.log('cs.hardCapuUSD: ', s.hardCapuUSD);

  }
	
}
