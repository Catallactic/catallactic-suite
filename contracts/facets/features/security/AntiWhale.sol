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

import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract AntiWhale is Ownable2Step {

	/********************************************************************************************************/
	/********************************************** WhiteLists **********************************************/
	/********************************************************************************************************/
	// whitelist Threshold
	uint256 whitelistuUSDThreshold = 1_000_000_000;
	function getWhitelistuUSDThreshold() external view returns (uint256) {
		return whitelistuUSDThreshold;
	}
	function setWhitelistuUSDThreshold(uint256 whitelistuUSDThreshold_) external onlyOwner {
		whitelistuUSDThreshold = whitelistuUSDThreshold_;
		emit UpdatedWhitelistThreshold(whitelistuUSDThreshold_);
	}
	event UpdatedWhitelistThreshold(uint256 whitelistuUSDThreshold_);

	// whitelisted addresses
	address[] private whitelistedAccs;
	function getWhitelisted() external view returns(address[] memory) {  
		return whitelistedAccs;
	}
	function getWhitelistUserCount() external view returns(uint) {  
		return whitelistedAccs.length;
	}

	// whitelist status
	mapping(address => bool) whitelisted;
	function isWhitelisted(address user) external view returns (bool) {
		return whitelisted[user];
	}
	
	function whitelistUser(address user) external onlyOwner {
		whitelisted[user] = true;
		whitelistedAccs.push(user);
		emit WhitelistedUser(user);
	}
	event WhitelistedUser(address user);

	function unwhitelistUser(address user) external onlyOwner {
		whitelisted[user] = false;
		emit UnwhitelistedUser(user);
	}
	event UnwhitelistedUser(address user);

	/********************************************************************************************************/
	/********************************************** Blacklists **********************************************/
	/********************************************************************************************************/
	// blacklist flag
	bool useBlacklist;
	function getUseBlacklist() external view returns (bool) {
		return useBlacklist;
	}
	function setUseBlacklist(bool useBlacklist_) external onlyOwner {
		useBlacklist = useBlacklist_;
		emit UpdatedUseBlacklist(useBlacklist_);
	}
	event UpdatedUseBlacklist(bool useBlacklist_);

	// blacklisted addresses
	address[] private blacklistedAccs;
	function getBlacklisted() external view returns(address[] memory) {  
		return blacklistedAccs;
	}
	function getBlacklistUserCount() external view returns(uint) {  
		return blacklistedAccs.length;
	}

	// blacklist status
	mapping(address => bool) blacklisted;
	function isBlacklisted(address user) external view returns (bool) {
		return blacklisted[user];
	}

	function blacklistUser(address user) external onlyOwner {
		blacklisted[user] = true;
		blacklistedAccs.push(user);
		emit BlacklistedUser(user);
	}
	event BlacklistedUser(address user);

	function unblacklistUser(address user) external onlyOwner {
		blacklisted[user] = false;
		emit UnblacklistedUser(user);
	}
	event UnblacklistedUser(address user);

	/********************************************************************************************************/
	/********************************************* Investment Limits ****************************************/
	/********************************************************************************************************/
	// Investment Limits
	mapping(address => bool) excludedFromMaxInvestment;
		function isExcludedFromMaxInvestment(address acc) external view returns(bool) {
		return excludedFromMaxInvestment[acc];
	}
	function setExcludedFromMaxInvestment(address account, bool exclude) external onlyOwner {
		excludedFromMaxInvestment[account] = exclude;
		emit ExcludedFromMaxInvestment(account, exclude);
	}
	event ExcludedFromMaxInvestment(address account, bool exclude);

	uint256 maxuUSDInvestment = 100_000_000_000;
	function getMaxUSDInvestment() external view returns(uint256) {
		return maxuUSDInvestment / 10**6;
	}
	function setMaxuUSDInvestment(uint256 maxuUSDInvestment_) external onlyOwner {
		maxuUSDInvestment = maxuUSDInvestment_;
		emit UpdatedMaxInvestment(maxuUSDInvestment_);
	}
	event UpdatedMaxInvestment(uint256 maxuUSDInvestment_);

	/********************************************************************************************************/
	/********************************************* Transfer Limits ******************************************/
	/********************************************************************************************************/
	// Transfer Limits
	mapping(address => bool) excludedFromMaxTransfer;
	function isExcludedFromMaxTransfer(address acc) external view returns(bool) {
		return excludedFromMaxTransfer[acc];
	}
	function setExcludedFromMaxTransfer(address account, bool exclude) external onlyOwner {
		excludedFromMaxTransfer[account] = exclude;
		emit ExcludedFromMaxTransfer(account, exclude);
	}
	event ExcludedFromMaxTransfer(address account, bool exclude);

	uint256 maxuUSDTransfer = 100_000_000_000;
	function getMaxUSDTransfer() external view returns(uint256) {  
		return maxuUSDTransfer / 10**6;
	}
	function setMaxuUSDTransfer(uint256 maxuUSDTransfer_) external onlyOwner {
		maxuUSDTransfer = maxuUSDTransfer_;
		emit UpdatedMaxTransfer(maxuUSDTransfer_);
	}
	event UpdatedMaxTransfer(uint256 maxuUSDTransfer_);

	uint256 minuUSDTransfer = 9_999_999;
	function getMinUSDTransfer() external view returns(uint256) {  
		return minuUSDTransfer / 10**6;
	}
	function setMinuUSDTransfer(uint256 minuUSDTransfer_) external onlyOwner {
		minuUSDTransfer = minuUSDTransfer_;
		emit UpdatedMinTransfer(minuUSDTransfer_);
	}
	event UpdatedMinTransfer(uint256 minuUSDTransfer_);

}