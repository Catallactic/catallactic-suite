// contracts/TokenVesting.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import "../../features/security/ReentrancyGuardUpgradeableNoStorage.sol";
import "../../features/security/Ownable2StepUpgradeableNoStorage.sol";
import "./GrantorRole.sol";
import "./IVestingFacet.sol";

import "hardhat/console.sol";

/**
 * @title VestingFacet
 */
contract VestingFacet is Ownable2StepUpgradeableNoStorage, ReentrancyGuardUpgradeableNoStorage, IVestingFacet, GrantorRole {
	using SafeERC20Upgradeable for IERC20Upgradeable;	

	/********************************************************************************************************/
	/************************************************* Vestings *********************************************/
	/********************************************************************************************************/
	function createVesting(uint256 _start, uint256 _cliff, uint256 _duration, uint256 _numSlices) external {
		require(owner() == address(0) || owner() == msg.sender, "ERRW_OWNR_NOT");
		require(_duration > 0, "TokenVesting: duration must be > 0");
		require(_numSlices >= 1, "TokenVesting: _numSlices must be >= 1");
		require(_duration >= _cliff, "TokenVesting: duration must be >= cliff");

    s._owner = msg.sender;

		// bytes32 vestingId = keccak256(abi.encodePacked(_start, _cliff, _duration, _slicePeriodSeconds));
		uint256 vestingId = s.vestingIds.length;
		s.vestingIds.push(vestingId);
		s.vestings[vestingId] = Vesting(_start, _cliff, _duration, _numSlices);
	}
	function getVestingIds() external view returns(uint256[] memory) {
		return s.vestingIds;
	}
	function getVesting(uint256 vestingId) external view returns(Vesting memory) {
		return s.vestings[vestingId];
	}

	/********************************************************************************************************/
	/***************************************** Vesting Schedules ********************************************/
	/********************************************************************************************************/
	/**
	 * @notice Creates a new vesting schedule for a beneficiary.
	 * @param _beneficiary address of the beneficiary to whom vested tokens are transferred
	 * @param _amount total amount of tokens to be released at the end of the vesting
	 */
	function createVestingSchedule(address _beneficiary, uint256 _amount, uint256 vestingId) external onlyGrantor {
		require(_amount > 0, "TokenVesting: amount must be > 0");

		//bytes32 vestingScheduleId = keccak256(abi.encodePacked(_beneficiary, s.holdersVestingCount[_beneficiary]));
		uint256 vestingScheduleId = s.vestingSchedulesIds.length;
		s.vestingSchedules[vestingScheduleId] = VestingSchedule(_beneficiary, _amount, vestingId, 0);
		s.totalVestableAmount = s.totalVestableAmount + _amount;
		s.vestingSchedulesIds.push(vestingScheduleId);
	}

	/**
	 * @dev Returns the number of vesting schedules managed by this contract.
	 * @return the number of vesting schedules
	 */
	function getVestingSchedulesIds() external view returns (uint256[] memory) {
		return s.vestingSchedulesIds;
	}

	/**
	 * @notice Returns the vesting schedule information for a given identifier.
	 * @return the vesting schedule structure information
	 */
	function getVestingSchedule(uint256 vestingScheduleId) external view returns (VestingSchedule memory) {
		return s.vestingSchedules[vestingScheduleId];
	}

	/**
	 * @notice Returns the total amount of vesting schedules.
	 * @return the total amount of vesting schedules
	 */
	function getTotalVestableAmount() external view returns (uint256) {
		return s.totalVestableAmount;
	}

	/********************************************************************************************************/
	/***************************************** Compute Amount ***********************************************/
	/********************************************************************************************************/
	/**
	 * @notice Computes the vested amount of tokens for the given vesting schedule identifier.
	 * @return the vested amount
	 */
	function computeReleasableAmount(uint256 vestingScheduleId) external view returns (uint256) {
		VestingSchedule storage vestingSchedule = s.vestingSchedules[vestingScheduleId];
		return _computeReleasableAmount(vestingSchedule);
	}

	/**
	 * @dev Computes the releasable amount of tokens for a vesting schedule.
	 * @return the amount of releasable tokens
	 */
	function _computeReleasableAmount(VestingSchedule memory vestingSchedule) internal view returns (uint256) {
		// Retrieve the current time.
		uint256 currentTime = block.timestamp;

		// If the current time is before the cliff, no tokens are releasable.
		Vesting memory vesting = s.vestings[vestingSchedule.vestingId];
		require(vesting.duration > 0, "TokenVesting: vesting must be configured");
		if ((currentTime < vesting.start + vesting.cliff))
			return 0;

		// Otherwise, some tokens are releasable.
		uint256 vestedSlides = (currentTime - vesting.start - vesting.cliff) * vesting.numSlides / vesting.duration;
		if (vestedSlides > vesting.numSlides)
			vestedSlides = vesting.numSlides;

		uint256 vestedAmount = vestedSlides * vestingSchedule.amountTotal / vesting.numSlides;
		uint256 releseableAmount = vestedAmount - vestingSchedule.released;
		return releseableAmount;
	}

	/********************************************************************************************************/
	/************************************************* Release *********************************************/
	/********************************************************************************************************/
	/**
	 * @notice Release vested amount of tokens.
	 * @param vestingScheduleId the vesting schedule identifier
	 */
	function release(uint256 vestingScheduleId) public nonReentrant {
		VestingSchedule storage vestingSchedule = s.vestingSchedules[vestingScheduleId];
		require(msg.sender == vestingSchedule.beneficiary || msg.sender == s._owner, "TokenVesting: only beneficiary and owner can release vested tokens");
		
		// compute amounts
		uint256 releseableAmount = _computeReleasableAmount(vestingSchedule);
		vestingSchedule.released = vestingSchedule.released + releseableAmount;
		s.totalVestableAmount = s.totalVestableAmount - releseableAmount;

		// release
		IERC20Upgradeable(s.tokenAddress).safeTransfer(vestingSchedule.beneficiary, releseableAmount);
	}

	// tokenWalletAddress
	function setTokenAddress(address payable add) external onlyOwner {
		require(add !=  address(0), "ERRW_INVA_ADD");

		s.tokenAddress = add;
	
		emit UpdatedTokenAddress(add);
	}
	event UpdatedTokenAddress(address payable add);

	function getTokenAddress() external view returns (address) {
		return s.tokenAddress;
	}

}