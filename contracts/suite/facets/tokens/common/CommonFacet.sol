// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "../../features/security/Ownable2StepUpgradeableNoStorage.sol";
import "../../features/lifecycle/InitializableNoStorage.sol";

import "../token/ERC20Facet.sol";
import "../ico/CrowdsaleFacet.sol";

contract CommonFacet is InitializableNoStorage, Ownable2StepUpgradeableNoStorage {
	
	// tokenWalletAddress
	function setTokenAddress(address payable add) external onlyOwner {
		require(add !=  address(0), "ERRW_INVA_ADD");

		LibAppStorage.appStorage(loc.location).tokenAddress = add;
	
		emit UpdatedTokenAddress(add);
	}
	event UpdatedTokenAddress(address payable add);

	function getTokenAddress() external view returns (address) {
		return LibAppStorage.appStorage(loc.location).tokenAddress;
	}

}
