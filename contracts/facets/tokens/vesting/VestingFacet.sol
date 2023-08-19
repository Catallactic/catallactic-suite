// contracts/TokenVesting.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import "../../features/security/ReentrancyGuardUpgradeableNoStorage.sol";
import "../../features/security/Ownable2StepUpgradeableNoStorage.sol";

/**
 * @title VestingFacet
 */
contract VestingFacet is Ownable2StepUpgradeableNoStorage, ReentrancyGuardUpgradeableNoStorage {
	using SafeERC20Upgradeable for IERC20Upgradeable;

	struct VestingSchedule {
		address beneficiary;																									// beneficiary of tokens after they are released
		uint256 cliff;																												// cliff time of the vesting start in seconds since the UNIX epoch
		uint256 start;																												// start time of the vesting period in seconds since the UNIX epoch
		uint256 duration;																											// duration of the vesting period in seconds
		uint256 slicePeriodSeconds;																						// duration of a slice period for the vesting in seconds
		bool revocable;																												// whether or not the vesting is revocable
		uint256 amountTotal;																									// total amount of tokens to be released at the end of the vesting
		uint256 released;																											// amount of tokens released
		bool revoked;																													// whether or not the vesting has been revoked
	}

	bytes32[] private vestingSchedulesIds;
	mapping(bytes32 => VestingSchedule) private vestingSchedules;
	uint256 private vestingSchedulesTotalAmount;
	mapping(address => uint256) private holdersVestingCount;

	/**
	 * @dev Reverts if the vesting schedule does not exist or has been revoked.
	 */
	modifier onlyIfVestingScheduleNotRevoked(bytes32 vestingScheduleId) {
		require(!vestingSchedules[vestingScheduleId].revoked);
		_;
	}

	/********************************************************************************************************/
	/************************************************* Lifecycle ********************************************/
	/********************************************************************************************************/
	/**
	 * @notice Creates a new vesting schedule for a beneficiary.
	 * @param _beneficiary address of the beneficiary to whom vested tokens are transferred
	 * @param _start start time of the vesting period
	 * @param _cliff duration in seconds of the cliff in which tokens will begin to vest
	 * @param _duration duration in seconds of the period in which the tokens will vest
	 * @param _slicePeriodSeconds duration of a slice period for the vesting in seconds
	 * @param _revocable whether the vesting is revocable or not
	 * @param _amount total amount of tokens to be released at the end of the vesting
	 */
	function createVestingSchedule(address _beneficiary,uint256 _start,uint256 _cliff,uint256 _duration,uint256 _slicePeriodSeconds,bool _revocable,uint256 _amount) external onlyOwner {
		require(getWithdrawableAmount() >= _amount, "TokenVesting: cannot create vesting schedule because not sufficient tokens");
		require(_duration > 0, "TokenVesting: duration must be > 0");
		require(_amount > 0, "TokenVesting: amount must be > 0");
		require(_slicePeriodSeconds >= 1, "TokenVesting: slicePeriodSeconds must be >= 1");
		require(_duration >= _cliff, "TokenVesting: duration must be >= cliff");

		bytes32 vestingScheduleId = computeNextVestingScheduleIdForHolder(_beneficiary);
		uint256 cliff = _start + _cliff;
		vestingSchedules[vestingScheduleId] = VestingSchedule(_beneficiary,cliff,_start,_duration,_slicePeriodSeconds,_revocable,_amount,0,false);
		vestingSchedulesTotalAmount = vestingSchedulesTotalAmount + _amount;
		vestingSchedulesIds.push(vestingScheduleId);
		uint256 currentVestingCount = holdersVestingCount[_beneficiary];
		holdersVestingCount[_beneficiary] = currentVestingCount + 1;
	}

	/**
	 * @dev Computes the next vesting schedule identifier for a given holder address.
	 */
	function computeNextVestingScheduleIdForHolder(address holder) public view returns (bytes32) {
		return computeVestingScheduleIdForAddressAndIndex(holder,holdersVestingCount[holder]);
	}

	/**
	 * @dev Computes the vesting schedule identifier for an address and an index.
	 */
	function computeVestingScheduleIdForAddressAndIndex(address holder,uint256 index) public pure returns (bytes32) {
		return keccak256(abi.encodePacked(holder, index));
	}

	/********************************************************************************************************/
	/******************************************* Total Vested ***********************************************/
	/********************************************************************************************************/	
	/**
	 * @notice Returns the total amount of vesting schedules.
	 * @return the total amount of vesting schedules
	 */
	function getVestingSchedulesTotalAmount() external view returns (uint256) {
		return vestingSchedulesTotalAmount;
	}

	/**
	 * @dev Returns the number of vesting schedules managed by this contract.
	 * @return the number of vesting schedules
	 */
	function getVestingSchedulesCount() public view returns (uint256) {
		return vestingSchedulesIds.length;
	}

	/**
	 * @dev Returns the vesting schedule id at the given index.
	 * @return the vesting id
	 */
	function getVestingIdAtIndex(uint256 index) external view returns (bytes32) {
		require(index < getVestingSchedulesCount(),"TokenVesting: index out of bounds");
		return vestingSchedulesIds[index];
	}

	/**
	 * @notice Returns the vesting schedule information for a given identifier.
	 * @return the vesting schedule structure information
	 */
	function getVestingSchedule(bytes32 vestingScheduleId) public view returns (VestingSchedule memory) {
		return vestingSchedules[vestingScheduleId];
	}

	/********************************************************************************************************/
	/************************************************ Holder Vested *****************************************/
	/********************************************************************************************************/
	/**
	 * @dev Returns the number of vesting schedules associated to a beneficiary.
	 * @return the number of vesting schedules
	 */
	function getVestingSchedulesCountByBeneficiary(address _beneficiary) external view returns (uint256) {
		return holdersVestingCount[_beneficiary];
	}

	/**
	 * @dev Returns the last vesting schedule for a given holder address.
	 */
	function getLastVestingScheduleForHolder(address holder) external view returns (VestingSchedule memory) {
		return vestingSchedules[computeVestingScheduleIdForAddressAndIndex(holder,holdersVestingCount[holder] - 1)];
	}

	/**
	 * @notice Returns the vesting schedule information for a given holder and index.
	 * @return the vesting schedule structure information
	 */
	function getVestingScheduleByAddressAndIndex(address holder,uint256 index) external view returns (VestingSchedule memory) {
		return getVestingSchedule(computeVestingScheduleIdForAddressAndIndex(holder, index));
	}

	/********************************************************************************************************/
	/***************************************** Compute Amount ***********************************************/
	/********************************************************************************************************/
	/**
	 * @notice Computes the vested amount of tokens for the given vesting schedule identifier.
	 * @return the vested amount
	 */
	function computeReleasableAmount(bytes32 vestingScheduleId) external view onlyIfVestingScheduleNotRevoked(vestingScheduleId) returns (uint256) {
		VestingSchedule storage vestingSchedule = vestingSchedules[vestingScheduleId];
		return _computeReleasableAmount(vestingSchedule);
	}

	/**
	 * @dev Computes the releasable amount of tokens for a vesting schedule.
	 * @return the amount of releasable tokens
	 */
	function _computeReleasableAmount(VestingSchedule memory vestingSchedule) internal view returns (uint256) {
		// Retrieve the current time.
		uint256 currentTime = getCurrentTime();

		// If the current time is before the cliff, no tokens are releasable.
		if ((currentTime < vestingSchedule.cliff) || vestingSchedule.revoked)
				return 0;
		
		// If the current time is after the vesting period, all tokens are releasable, minus the amount already released.
		if (currentTime >= vestingSchedule.start + vestingSchedule.duration)
				return vestingSchedule.amountTotal - vestingSchedule.released;

		// Otherwise, some tokens are releasable. Compute the number of full vesting periods that have elapsed.
		uint256 timeFromStart = currentTime - vestingSchedule.start;
		uint256 secondsPerSlice = vestingSchedule.slicePeriodSeconds;
		uint256 vestedSlicePeriods = timeFromStart / secondsPerSlice;
		uint256 vestedSeconds = vestedSlicePeriods * secondsPerSlice;
		// Compute the amount of tokens that are vested.
		uint256 vestedAmount = (vestingSchedule.amountTotal * vestedSeconds) / vestingSchedule.duration;
		// Subtract the amount already released and return.
		return vestedAmount - vestingSchedule.released;
	}

	/**
	 * @dev Returns the current time.
	 * @return the current timestamp in seconds.
	 */
	function getCurrentTime() internal view virtual returns (uint256) {
			return block.timestamp;
	}

	/**
	 * @dev Returns the amount of tokens that can be withdrawn by the owner.
	 * @return the amount of tokens
	 */
	function getWithdrawableAmount() public view returns (uint256) {
		//return _token.balanceOf(address(this)) - vestingSchedulesTotalAmount;
		return 100_000;
	}

	/********************************************************************************************************/
	/************************************************* Revoke ***********************************************/
	/********************************************************************************************************/
	/**
	 * @notice Revokes the vesting schedule for given identifier.
	 * @param vestingScheduleId the vesting schedule identifier
	 */
	function revoke(bytes32 vestingScheduleId) external onlyOwner onlyIfVestingScheduleNotRevoked(vestingScheduleId) {
		VestingSchedule storage vestingSchedule = vestingSchedules[vestingScheduleId];
		require(vestingSchedule.revocable,"TokenVesting: vesting is not revocable");
		uint256 vestedAmount = _computeReleasableAmount(vestingSchedule);
		if (vestedAmount > 0) {
				release(vestingScheduleId, vestedAmount);
		}
		uint256 unreleased = vestingSchedule.amountTotal - vestingSchedule.released;
		vestingSchedulesTotalAmount = vestingSchedulesTotalAmount - unreleased;
		vestingSchedule.revoked = true;
	}

	/********************************************************************************************************/
	/************************************************* Withdraw *********************************************/
	/********************************************************************************************************/
	/**
	 * @notice Release vested amount of tokens.
	 * @param vestingScheduleId the vesting schedule identifier
	 * @param amount the amount to release
	 */
	function release(bytes32 vestingScheduleId,uint256 amount) public nonReentrant onlyIfVestingScheduleNotRevoked(vestingScheduleId) {
		VestingSchedule storage vestingSchedule = vestingSchedules[vestingScheduleId];
		bool isBeneficiary = msg.sender == vestingSchedule.beneficiary;

		bool isReleasor = (msg.sender == s._owner);
		require(isBeneficiary || isReleasor,"TokenVesting: only beneficiary and owner can release vested tokens");
		uint256 vestedAmount = _computeReleasableAmount(vestingSchedule);
		require(vestedAmount >= amount,"TokenVesting: cannot release tokens, not enough vested tokens");
		vestingSchedule.released = vestingSchedule.released + amount;
		address payable beneficiaryPayable = payable(vestingSchedule.beneficiary);
		vestingSchedulesTotalAmount = vestingSchedulesTotalAmount - amount;
		//SafeTransferLib.safeTransfer(_token, beneficiaryPayable, amount);
		IERC20Upgradeable(address(this)).safeTransfer(beneficiaryPayable , amount);
	}

	/**
	 * @notice Withdraw the specified amount if possible.
	 * @param amount the amount to withdraw
	 */
	function withdraw(uint256 amount) external nonReentrant onlyOwner {
		require(getWithdrawableAmount() >= amount, "TokenVesting: not enough withdrawable funds"
		);
		/*
			* @dev Replaced owner() with msg.sender => address of WITHDRAWER_ROLE
			*/
		//SafeTransferLib.safeTransfer(_token, msg.sender, amount);
		IERC20Upgradeable(address(this)).safeTransfer( msg.sender, amount);
	}

}