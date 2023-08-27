// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "../../features/security/Ownable2StepUpgradeableNoStorage.sol";
import "../../features/security/Roles.sol";
import "../../../storage/AppStorage.sol";

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

    using Roles for Role;

    event GrantorAdded(address indexed account);
    event GrantorRemoved(address indexed account);

    mapping(address => bool) private _isUniformGrantor;

    modifier onlyGrantor() {
        require(isGrantor(msg.sender), "onlyGrantor");
        _;
    }

    modifier onlyGrantorOrSelf(address account) {
        require(isGrantor(msg.sender) || msg.sender == account, "onlyGrantorOrSelf");
        _;
    }

    function isGrantor(address account) public view returns (bool) {
        return s._grantors.has(account);
    }

    function addGrantor(address account, bool isUniformGrantor) public onlyOwner {
        _addGrantor(account, isUniformGrantor);
    }

    function removeGrantor(address account) public onlyOwner {
        _removeGrantor(account);
    }

    function _addGrantor(address account, bool isUniformGrantor) private {
        require(account != address(0));
        s._grantors.add(account);
        _isUniformGrantor[account] = isUniformGrantor;
        emit GrantorAdded(account);
    }

    function _removeGrantor(address account) private {
        require(account != address(0));
        s._grantors.remove(account);
        emit GrantorRemoved(account);
    }

    function isUniformGrantor(address account) public view returns (bool) {
        return isGrantor(account) && _isUniformGrantor[account];
    }

    modifier onlyUniformGrantor() {
        require(isUniformGrantor(msg.sender), "Only uniform grantor role can do this.");
        // Only grantor role can do this.
        _;
    }

}