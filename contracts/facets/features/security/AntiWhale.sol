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

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "./LibAntiWhaleStorage.sol";

contract AntiWhale is Ownable2StepUpgradeable {
	LibAntiWhaleStorage.MyStruct internal w;

	/********************************************************************************************************/
	/********************************************** WhiteLists **********************************************/
	/********************************************************************************************************/
	// whitelist Threshold
	function getWhitelistuUSDThreshold() external view returns (uint256) {
		return w.whitelistuUSDThreshold;
	}
	function setWhitelistuUSDThreshold(uint256 whitelistuUSDThreshold_) external onlyOwner {
		w.whitelistuUSDThreshold = whitelistuUSDThreshold_;
		emit UpdatedWhitelistThreshold(whitelistuUSDThreshold_);
	}
	event UpdatedWhitelistThreshold(uint256 whitelistuUSDThreshold_);

	// whitelisted addresses
	function getWhitelisted() external view returns(address[] memory) {  
		return w.whitelistedAccs;
	}
	function getWhitelistUserCount() external view returns(uint) {  
		return w.whitelistedAccs.length;
	}

	// whitelist status
	function isWhitelisted(address user) external view returns (bool) {
		return w.whitelisted[user];
	}
	
	function whitelistUser(address user) external onlyOwner {
		w.whitelisted[user] = true;
		w.whitelistedAccs.push(user);
		emit WhitelistedUser(user);
	}
	event WhitelistedUser(address user);

	function unwhitelistUser(address user) external onlyOwner {
		w.whitelisted[user] = false;
		emit UnwhitelistedUser(user);
	}
	event UnwhitelistedUser(address user);

	/********************************************************************************************************/
	/********************************************** Blacklists **********************************************/
	/********************************************************************************************************/
	// blacklist flag
	function getUseBlacklist() external view returns (bool) {
		return w.useBlacklist;
	}
	function setUseBlacklist(bool useBlacklist_) external onlyOwner {
		w.useBlacklist = useBlacklist_;
		emit UpdatedUseBlacklist(useBlacklist_);
	}
	event UpdatedUseBlacklist(bool useBlacklist_);

	// blacklisted addresses
	function getBlacklisted() external view returns(address[] memory) {  
		return w.blacklistedAccs;
	}
	function getBlacklistUserCount() external view returns(uint) {  
		return w.blacklistedAccs.length;
	}

	// blacklist status
	function isBlacklisted(address user) external view returns (bool) {
		return w.blacklisted[user];
	}

	function blacklistUser(address user) external onlyOwner {
		w.blacklisted[user] = true;
		w.blacklistedAccs.push(user);
		emit BlacklistedUser(user);
	}
	event BlacklistedUser(address user);

	function unblacklistUser(address user) external onlyOwner {
		w.blacklisted[user] = false;
		emit UnblacklistedUser(user);
	}
	event UnblacklistedUser(address user);

	/********************************************************************************************************/
	/********************************************* Investment Limits ****************************************/
	/********************************************************************************************************/
	// Investment Limits
	function isExcludedFromMaxInvestment(address acc) external view returns(bool) {
		return w.excludedFromMaxInvestment[acc];
	}
	function setExcludedFromMaxInvestment(address account, bool exclude) external onlyOwner {
		w.excludedFromMaxInvestment[account] = exclude;
		emit ExcludedFromMaxInvestment(account, exclude);
	}
	event ExcludedFromMaxInvestment(address account, bool exclude);

	function getMaxUSDInvestment() external view returns(uint256) {
		return w.maxuUSDInvestment / 10**6;
	}
	function setMaxuUSDInvestment(uint256 maxuUSDInvestment_) external onlyOwner {
		w.maxuUSDInvestment = maxuUSDInvestment_;
		emit UpdatedMaxInvestment(maxuUSDInvestment_);
	}
	event UpdatedMaxInvestment(uint256 maxuUSDInvestment_);

	/********************************************************************************************************/
	/********************************************* Transfer Limits ******************************************/
	/********************************************************************************************************/
	// Transfer Limits
	
	function isExcludedFromMaxTransfer(address acc) external view returns(bool) {
		return w.excludedFromMaxTransfer[acc];
	}
	function setExcludedFromMaxTransfer(address account, bool exclude) external onlyOwner {
		w.excludedFromMaxTransfer[account] = exclude;
		emit ExcludedFromMaxTransfer(account, exclude);
	}
	event ExcludedFromMaxTransfer(address account, bool exclude);

	
	function getMaxUSDTransfer() external view returns(uint256) {  
		return w.maxuUSDTransfer / 10**6;
	}
	function setMaxuUSDTransfer(uint256 maxuUSDTransfer_) external onlyOwner {
		w.maxuUSDTransfer = maxuUSDTransfer_;
		emit UpdatedMaxTransfer(maxuUSDTransfer_);
	}
	event UpdatedMaxTransfer(uint256 maxuUSDTransfer_);

	function getMinUSDTransfer() external view returns(uint256) {  
		return w.minuUSDTransfer / 10**6;
	}
	function setMinuUSDTransfer(uint256 minuUSDTransfer_) external onlyOwner {
		w.minuUSDTransfer = minuUSDTransfer_;
		emit UpdatedMinTransfer(minuUSDTransfer_);
	}
	event UpdatedMinTransfer(uint256 minuUSDTransfer_);

}