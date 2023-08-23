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

	/**
	 * @notice Creates a new vesting schedule for a beneficiary.
	 * @param _start start time of the vesting period
	 * @param _cliff duration in seconds of the cliff in which tokens will begin to vest
	 * @param _duration duration in seconds of the period in which the tokens will vest
	 * @param _slicePeriodSeconds duration of a slice period for the vesting in seconds
	 */
	function createVesting(uint256 _start,uint256 _cliff,uint256 _duration,uint256 _slicePeriodSeconds) external {
		require(owner() == address(0) || owner() == msg.sender, "ERRW_OWNR_NOT");
		require(_duration > 0, "TokenVesting: duration must be > 0");
		require(_slicePeriodSeconds >= 1, "TokenVesting: slicePeriodSeconds must be >= 1");
		require(_duration >= _cliff, "TokenVesting: duration must be >= cliff");

    s._owner = msg.sender;

		uint256 cliff = _start + _cliff;

		// bytes32 vestingId = keccak256(abi.encodePacked(_start, _cliff, _duration, _slicePeriodSeconds));
		uint256 vestingId = s.vestingIds.length;
		s.vestingIds.push(vestingId);
		s.vestings[vestingId] = Vesting(cliff,_start,_duration,_slicePeriodSeconds);
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
		s.vestingSchedulesTotalAmount = s.vestingSchedulesTotalAmount + _amount;
		s.vestingSchedulesIds.push(vestingScheduleId);
		uint256 currentVestingCount = s.holdersVestingCount[_beneficiary];
		s.holdersVestingCount[_beneficiary] = currentVestingCount + 1;
	}

	/**
	 * @dev Returns the number of vesting schedules managed by this contract.
	 * @return the number of vesting schedules
	 */
	function getVestingSchedulesCount() public view returns (uint256) {
		return s.vestingSchedulesIds.length;
	}

	/**
	 * @dev Returns the vesting schedule id at the given index.
	 * @return the vesting id
	 */
	function getVestingScheduleIdAtIndex(uint256 index) external view returns (uint256) {
		require(index < getVestingSchedulesCount(),"TokenVesting: index out of bounds");
		return s.vestingSchedulesIds[index];
	}

	/**
	 * @notice Returns the vesting schedule information for a given identifier.
	 * @return the vesting schedule structure information
	 */
	function getVestingSchedule(uint256 vestingScheduleId) public view returns (VestingSchedule memory) {
		return s.vestingSchedules[vestingScheduleId];
	}

	/**
	 * @dev Returns the number of vesting schedules associated to a beneficiary.
	 * @return the number of vesting schedules
	 */
	function getVestingSchedulesCountByBeneficiary(address _beneficiary) external view returns (uint256) {
		return s.holdersVestingCount[_beneficiary];
	}


	/**
	 * @notice Returns the total amount of vesting schedules.
	 * @return the total amount of vesting schedules
	 */
	function getVestingSchedulesTotalAmount() external view returns (uint256) {
		return s.vestingSchedulesTotalAmount;
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

		Vesting memory vesting = s.vestings[vestingSchedule.vestingId];
		console.log('currentTime ', currentTime);
		console.log('vesting.cliff ', vesting.cliff);

		// If the current time is before the cliff, no tokens are releasable.
		if ((currentTime < vesting.cliff))
				return 0;
		
		// Otherwise, some tokens are releasable.
		uint256 totalSlides = vesting.duration / vesting.slicePeriodSeconds;
		uint256 vestedSlides = (currentTime - vesting.start) / vesting.slicePeriodSeconds;
		uint256 vestedAmount = (totalSlides - vestedSlides) / totalSlides;
		return vestedAmount - vestingSchedule.released;
	}

	/********************************************************************************************************/
	/************************************************* Release *********************************************/
	/********************************************************************************************************/
	/**
	 * @notice Release vested amount of tokens.
	 * @param vestingScheduleId the vesting schedule identifier
	 * @param amount the amount to release
	 */
	function release(uint256 vestingScheduleId,uint256 amount) public nonReentrant {
		VestingSchedule storage vestingSchedule = s.vestingSchedules[vestingScheduleId];
		require(msg.sender == vestingSchedule.beneficiary || msg.sender == s._owner, "TokenVesting: only beneficiary and owner can release vested tokens");
		
		uint256 vestedAmount = _computeReleasableAmount(vestingSchedule);
		require(vestedAmount >= amount,"TokenVesting: cannot release tokens, not enough vested tokens");

		// release
		vestingSchedule.released = vestingSchedule.released + amount;
		address payable beneficiaryPayable = payable(vestingSchedule.beneficiary);
		s.vestingSchedulesTotalAmount = s.vestingSchedulesTotalAmount - amount;
		IERC20Upgradeable(s.tokenAddress).safeTransfer(beneficiaryPayable , amount);
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