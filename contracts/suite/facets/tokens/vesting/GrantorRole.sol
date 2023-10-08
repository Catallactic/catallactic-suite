// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "../../features/security/Ownable2StepUpgradeableNoStorage.sol";

/**
 * @dev GrantorRole trait
 *
 * This adds support for a role that allows creation of vesting token grants, allocated from the
 * role holder's wallet.
 *
 * NOTE: We have implemented a role model only the contract owner can assign/un-assign roles.
 * This is necessary to support enterprise software, which requires a permissions model in which
 * roles can be owner-administered, in contrast to a blockchain community approach in which
 * permissions can be self-administered. Therefore, this implementation replaces the self-service
 * "renounce" approach with one where only the owner is allowed to makes role changes.
 *
 * Owner is not allowed to renounce ownership, lest the contract go without administration. But
 * it is ok for owner to shed initially granted roles by removing role from self.
 */
contract GrantorRole is Ownable2StepUpgradeableNoStorage {

	event GrantorAdded(address indexed account);
	event GrantorRemoved(address indexed account);

	modifier onlyGrantor() {
		require(isGrantor(msg.sender), "onlyGrantor");
		_;
	}

	modifier onlyGrantorOrSelf(address account) {
		require(isGrantor(msg.sender) || msg.sender == account, "onlyGrantorOrSelf");
		_;
	}

	function isGrantor(address account) public view returns (bool) {
		return LibAppStorage.appStorage()._grantors.bearer[account];
	}

	function addGrantor(address account) public onlyOwner {
		require(account != address(0));
		LibAppStorage.appStorage()._grantors.bearer[account] = true;
		emit GrantorAdded(account);
	}

	function removeGrantor(address account) public onlyOwner {
		require(account != address(0));
		LibAppStorage.appStorage()._grantors.bearer[account] = false;
		emit GrantorRemoved(account);
	}

}