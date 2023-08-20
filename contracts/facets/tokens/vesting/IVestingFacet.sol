// contracts/TokenVesting.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.18;

/**
 * @title VestingFacet
 */
interface IVestingFacet {

	function createVesting(uint256 _start, uint256 _cliff, uint256 _duration, uint256 _slicePeriodSeconds, bool _revocable) external returns (bytes32);

	function createVestingSchedule(address _beneficiary, uint256 _amount, bytes32 vestingId) external;

}