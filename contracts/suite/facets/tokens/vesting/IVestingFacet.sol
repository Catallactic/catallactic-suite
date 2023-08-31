// contracts/TokenVesting.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.18;

/**
 * @title VestingFacet
 */
interface IVestingFacet {

	function createVesting(string calldata vestingId, uint256 _start, uint256 _cliff, uint256 _duration, uint256 _slicePeriodSeconds) external;

	function createVestingSchedule(address _beneficiary, uint256 _amount, string calldata vestingId) external;

}