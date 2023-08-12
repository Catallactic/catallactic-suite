/**
 *                _ _   ______                        _
 *	░██████╗░░█████╗░░██████╗░█████╗░██╗░░░░░██╗░█████╗░██╗░░██╗
 *	██╔════╝░██╔══██╗██╔════╝██╔══██╗██║░░░░░██║██╔══██╗██║░██╔╝
 *	██║░░██╗░███████║╚█████╗░██║░░╚═╝██║░░░░░██║██║░░╚═╝█████═╝░
 *	██║░░╚██╗██╔══██║░╚═══██╗██║░░██╗██║░░░░░██║██║░░██╗██╔═██╗░
 *	╚██████╔╝██║░░██║██████╔╝╚█████╔╝███████╗██║╚█████╔╝██║░╚██╗
 *	░╚═════╝░╚═╝░░╚═╝╚═════╝░░╚════╝░╚══════╝╚═╝░╚════╝░╚═╝░░╚═╝
 *
 *
 * Web: https://gasclick.net
 *
 *
 * Merging the new cryptoeconomy and the traditional economy.
 * By leveraging the value already existing on LPG consumption, we tokenize, capture and offer it to worldwide investors. 
 * A match made in heaven.
 * 
 */

// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.18;

import "./Ownable2StepUpgradeableNoStorage.sol";

contract AntiWhaleNoStorage is Ownable2StepUpgradeableNoStorage {

	/********************************************************************************************************/
	/********************************************** WhiteLists **********************************************/
	/********************************************************************************************************/
	// whitelist Threshold
	function getWhitelistuUSDThreshold() external view returns (uint256) {
		return s.whitelistuUSDThreshold;
	}
	function setWhitelistuUSDThreshold(uint256 whitelistuUSDThreshold_) external onlyOwner {
		s.whitelistuUSDThreshold = whitelistuUSDThreshold_;
		emit UpdatedWhitelistThreshold(whitelistuUSDThreshold_);
	}
	event UpdatedWhitelistThreshold(uint256 whitelistuUSDThreshold_);

	// whitelisted addresses
	function getWhitelisted() external view returns(address[] memory) {  
		return s.whitelistedAccs;
	}
	function getWhitelistUserCount() external view returns(uint) {  
		return s.whitelistedAccs.length;
	}

	// whitelist status
	function isWhitelisted(address user) external view returns (bool) {
		return s.whitelisted[user];
	}
	
	function whitelistUser(address user) external onlyOwner {
		s.whitelisted[user] = true;
		s.whitelistedAccs.push(user);
		emit WhitelistedUser(user);
	}
	event WhitelistedUser(address user);

	function unwhitelistUser(address user) external onlyOwner {
		s.whitelisted[user] = false;
		emit UnwhitelistedUser(user);
	}
	event UnwhitelistedUser(address user);

	/********************************************************************************************************/
	/********************************************** Blacklists **********************************************/
	/********************************************************************************************************/
	// blacklist flag
	function getUseBlacklist() external view returns (bool) {
		return s.useBlacklist;
	}
	function setUseBlacklist(bool useBlacklist_) external onlyOwner {
		s.useBlacklist = useBlacklist_;
		emit UpdatedUseBlacklist(useBlacklist_);
	}
	event UpdatedUseBlacklist(bool useBlacklist_);

	// blacklisted addresses
	function getBlacklisted() external view returns(address[] memory) {  
		return s.blacklistedAccs;
	}
	function getBlacklistUserCount() external view returns(uint) {  
		return s.blacklistedAccs.length;
	}

	// blacklist status
	function isBlacklisted(address user) external view returns (bool) {
		return s.blacklisted[user];
	}

	function blacklistUser(address user) external onlyOwner {
		s.blacklisted[user] = true;
		s.blacklistedAccs.push(user);
		emit BlacklistedUser(user);
	}
	event BlacklistedUser(address user);

	function unblacklistUser(address user) external onlyOwner {
		s.blacklisted[user] = false;
		emit UnblacklistedUser(user);
	}
	event UnblacklistedUser(address user);

	/********************************************************************************************************/
	/********************************************* Investment Limits ****************************************/
	/********************************************************************************************************/
	// Investment Limits
	function isExcludedFromMaxInvestment(address acc) external view returns(bool) {
		return s.excludedFromMaxInvestment[acc];
	}
	function setExcludedFromMaxInvestment(address account, bool exclude) external onlyOwner {
		s.excludedFromMaxInvestment[account] = exclude;
		emit ExcludedFromMaxInvestment(account, exclude);
	}
	event ExcludedFromMaxInvestment(address account, bool exclude);

	function getMaxUSDInvestment() external view returns(uint256) {
		return s.maxuUSDInvestment / 10**6;
	}
	function setMaxuUSDInvestment(uint256 maxuUSDInvestment_) external onlyOwner {
		s.maxuUSDInvestment = maxuUSDInvestment_;
		emit UpdatedMaxInvestment(maxuUSDInvestment_);
	}
	event UpdatedMaxInvestment(uint256 maxuUSDInvestment_);

	/********************************************************************************************************/
	/********************************************* Transfer Limits ******************************************/
	/********************************************************************************************************/
	// Transfer Limits
	
	function isExcludedFromMaxTransfer(address acc) external view returns(bool) {
		return s.excludedFromMaxTransfer[acc];
	}
	function setExcludedFromMaxTransfer(address account, bool exclude) external onlyOwner {
		s.excludedFromMaxTransfer[account] = exclude;
		emit ExcludedFromMaxTransfer(account, exclude);
	}
	event ExcludedFromMaxTransfer(address account, bool exclude);

	
	function getMaxUSDTransfer() external view returns(uint256) {  
		return s.maxuUSDTransfer / 10**6;
	}
	function setMaxuUSDTransfer(uint256 maxuUSDTransfer_) external onlyOwner {
		s.maxuUSDTransfer = maxuUSDTransfer_;
		emit UpdatedMaxTransfer(maxuUSDTransfer_);
	}
	event UpdatedMaxTransfer(uint256 maxuUSDTransfer_);

	function getMinUSDTransfer() external view returns(uint256) {  
		return s.minuUSDTransfer / 10**6;
	}
	function setMinuUSDTransfer(uint256 minuUSDTransfer_) external onlyOwner {
		s.minuUSDTransfer = minuUSDTransfer_;
		emit UpdatedMinTransfer(minuUSDTransfer_);
	}
	event UpdatedMinTransfer(uint256 minuUSDTransfer_);

}