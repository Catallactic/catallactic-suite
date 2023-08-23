// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "../../features/security/ReentrancyGuardUpgradeableNoStorage.sol";
import "../../features/security/AntiWhaleNoStorage.sol";
import "../../features/lifecycle/InitializableNoStorage.sol";

import "../vesting/IVestingFacet.sol";

import "hardhat/console.sol";

contract CrowdsaleFacet is AntiWhaleNoStorage, ReentrancyGuardUpgradeableNoStorage {
	using SafeERC20Upgradeable for IERC20Upgradeable;

	/********************************************************************************************************/
	/************************************************* Lifecycle ********************************************/
	/********************************************************************************************************/
	// not initializer because should be able to create several crowdsales
	function createCrowdsale(uint256 uUsdPrice_, uint256 hardCap_, uint256 softCap_, uint256 whitelistuUSDThreshold_, uint256 maxuUSDInvestment_, uint256 maxuUSDTransfer_, uint256 minuUSDTransfer_, uint256 percentVested_, uint256 vestingId_) public {
		require(owner() == address(0) || owner() == msg.sender, "ERRW_OWNR_NOT");
		require(s.stage == CrowdsaleStage.NotStarted, "ERRD_MUST_ONG");																																						// ICO must be not started
		require(s.totaluUSDTInvested == 0, "ERRD_MUST_ONG");																																											// ICO must not have investment
		require(percentVested_ < 100, "ERRR_VEST_100");																																														// Vesting percentage smaller than 100

    s._owner = msg.sender;

		s.uUsdPrice = uUsdPrice_;
		s.hardCapuUSD = hardCap_;
		s.softCapuUSD = softCap_;
		s.percentVested = percentVested_;
		s.vestingId = vestingId_;

		s.whitelistuUSDThreshold = whitelistuUSDThreshold_;
		s.maxuUSDInvestment = maxuUSDInvestment_;
		s.maxuUSDTransfer = maxuUSDTransfer_;
		s.minuUSDTransfer = minuUSDTransfer_;
	}

	// Crowdsale Stage
	function getCrowdsaleStage() external view returns (CrowdsaleStage) {
		return s.stage;
	}
	function setCrowdsaleStage(uint stage_) external onlyOwner {
		if(uint(CrowdsaleStage.NotStarted) == stage_) {							// 0
			s.stage = CrowdsaleStage.NotStarted;
		} else if (uint(CrowdsaleStage.Ongoing) == stage_) {				// 1
			s.stage = CrowdsaleStage.Ongoing;
		} else if (uint(CrowdsaleStage.OnHold) == stage_) {					// 2
			s.stage = CrowdsaleStage.OnHold;
		} else if (uint(CrowdsaleStage.Finished) == stage_) {				// 3
			s.stage = CrowdsaleStage.Finished;
		}

		emit UpdatedCrowdsaleStage(stage_);
	}
	event UpdatedCrowdsaleStage(uint stage_);

	function reset() external onlyOwner {
		s.stage = CrowdsaleStage.NotStarted;
		s.uUsdPrice = 0;
		s.totaluUSDTInvested = 0;
		s.hardCapuUSD = 0;
		s.softCapuUSD = 0;
		s.tokenAddress = payable(address(0x0));
		s.targetWalletAddress = payable(address(0x0));
		s.percentVested = 0;
		s.vestingId = 0;
		s.vestingAddress = address(0x0);
	}

	/********************************************************************************************************/
	/******************************************* Payment Tokens *********************************************/
	/********************************************************************************************************/
	// Payment Tokens
	function getPaymentSymbols() external view returns (string[] memory) {
		return s.paymentSymbols;
	}

	function getPaymentToken(string calldata symbol) external view returns(PaymentToken memory) {
		return s.paymentTokens[symbol];
	}
	function setPaymentToken(string calldata symbol, address tokenAdd, address priceFeed, uint256 uUSDPerTokens, uint8 decimals) external onlyOwner {
		require(tokenAdd !=  address(0), "ERRW_INVA_ADD");

		if (s.paymentTokens[symbol].ptDecimals == 0) {
			s.paymentSymbols.push(symbol);
		}

		s.paymentTokens[symbol] = PaymentToken({
      ptTokenAddress: tokenAdd,
      ptPriceFeed: priceFeed,
			ptUUSD_PER_TOKEN: uUSDPerTokens,
			ptDecimals: decimals,
			ptuUSDInvested: 0,
			ptAmountInvested: 0
    });

		emit AddedPaymentToken(symbol);
	}
	event AddedPaymentToken(string symbol);

	function deletePaymentToken(string calldata symbol, uint8 index) external onlyOwner {
		require(keccak256(bytes(symbol)) == keccak256(bytes(s.paymentSymbols[index])), "ERRP_INDX_PAY");

		delete s.paymentTokens[symbol];

		s.paymentSymbols[index] = s.paymentSymbols[s.paymentSymbols.length - 1];
		s.paymentSymbols.pop();

		emit DeletedPaymentToken(symbol);
	}
	event DeletedPaymentToken(string symbol);

	bytes32 constant COIN = keccak256("COIN");

	// price update
	function getUusdPerToken(string calldata symbol) external view returns (uint256) {
		AggregatorV3Interface currencyToUsdPriceFeed = AggregatorV3Interface(s.paymentTokens[symbol].ptPriceFeed);
		(,int256 answer,,,) = currencyToUsdPriceFeed.latestRoundData();
		return(uint256(answer) * 10**6 / 10**currencyToUsdPriceFeed.decimals());
	}

	/********************************************************************************************************/
	/*********************************************** Invested ***********************************************/
	/********************************************************************************************************/
	function getTotaluUSDInvested() external view returns (uint256) {
		return s.totaluUSDTInvested;
	}	

	/**
	 * We need to make HardCap updateable to allow a multichain funding round. 
	 * We need multichain funding round to give oppportunity to both, retail investors, which invest small amounts 
	 * and are impacted by transaction fees and VCs that are happy to invest in costly chains.
	 * There is not a crosschain supply integrity solution in current state of arts
	 */
	function getHardCap() external view returns (uint256) {
		return s.hardCapuUSD / 10**6;
	}
	function setHardCapuUSD(uint256 hardCap) external onlyOwner {
		s.hardCapuUSD = hardCap;
		emit UpdatedHardCap(hardCap);
	}
	event UpdatedHardCap(uint256 hardCap);

	/**
	 * We need to make SoftCap updateable to allow a multichain funding round. 
	 * We need multichain funding round to give oppportunity to both, retail investors, which invest small amounts 
	 * and are impacted by transaction fees and VCs that are happy to invest in costly chains.
	 * There is not a crosschain supply integrity solution in current state of arts
	 */
	function getSoftCap() external view returns (uint256) {
		return s.softCapuUSD / 10**6;
	}
	function setSoftCapuUSD(uint256 softCap) external onlyOwner {
		s.softCapuUSD = softCap;
		emit UpdatedSoftCap(softCap);
	}
	event UpdatedSoftCap(uint256 hardCap);

	// Crowdsale Price
	function getPriceuUSD() external view returns (uint256) {
		return s.uUsdPrice;
	}
	
	function gettDynamicPrice() external view returns(bool) {
		return s.dynamicPrice;
	}
	function setDynamicPrice(bool dynPrice) external onlyOwner {
		s.dynamicPrice = dynPrice;
		emit UpdatedDynamicPrice(dynPrice);
	}
	event UpdatedDynamicPrice(bool dynPrice);

	/********************************************************************************************************/
	/********************************************* Investors ************************************************/
	/********************************************************************************************************/
	// Investors
	function getInvestors() external view returns (address[] memory) {
		return s.investors;
	}
	function getInvestorsCount() external view returns(uint) {  
		return s.investors.length;
	}

	function getContribution(address investor, string calldata symbol) external view returns(uint256){
		require(investor !=  address(0), "ERRW_INVA_ADD");
		return s.contributions[investor].conts[symbol].cAmountInvested;
	}

	function getuUSDContribution(address investor, string calldata symbol) external view returns(uint256){
		require(investor !=  address(0), "ERRW_INVA_ADD");
		return s.contributions[investor].conts[symbol].cuUSDInvested;
	}

	function getuUSDInvested(address investor) external view returns(uint256){
		require(investor !=  address(0), "ERRW_INVA_ADD");
		return s.contributions[investor].uUSDInvested;
	}
	function getuUSDToClaim(address investor) external view returns(uint256){
		require(investor !=  address(0), "ERRW_INVA_ADD");
		return s.contributions[investor].uUSDToPay;
	}

	/********************************************************************************************************/
	/*********************************************** Deposit ************************************************/
	/********************************************************************************************************/
	receive() external payable {
		if(msg.value > 0) depositWithuUSD("COIN", msg.value);																			// exclude unwanted wallet calls
	}
	fallback() external payable {
		if(msg.value > 0) depositWithuUSD("COIN", msg.value);																			// exclude unwanted wallet calls
	}
	function depositTokens(string calldata symbol, uint256 rawAmountWitDecimals) external nonReentrant {
		depositWithuUSD(symbol, rawAmountWitDecimals);
	}

	function depositWithuUSD(string memory symbol, uint256 rawAmountWitDecimals) internal {
		// update price. Consider chainlink returning zero or negative
		// stale case is ignored because investor is prompted a price in the UI, the difference can be minimal, and check would need using block.timestamp and higher gas consumption
		if(s.dynamicPrice && s.paymentTokens[symbol].ptPriceFeed != address(0)) {
			AggregatorV3Interface currencyToUsdPriceFeed = AggregatorV3Interface(s.paymentTokens[symbol].ptPriceFeed);
			(,int rawUsdPrice,,,) = currencyToUsdPriceFeed.latestRoundData();
			if(rawUsdPrice > 0) {
				s.paymentTokens[symbol].ptUUSD_PER_TOKEN = uint256(rawUsdPrice) * 10**6 / 10**currencyToUsdPriceFeed.decimals();
			}
		}
		
		// calculate uUSDAmount
		deposit(symbol, rawAmountWitDecimals, rawAmountWitDecimals * s.paymentTokens[symbol].ptUUSD_PER_TOKEN / 10**s.paymentTokens[symbol].ptDecimals);
	}

	// receive contribution
	function deposit(string memory symbol, uint256 rawAmountWitDecimals, uint uUSDAmount) internal {
		require(s.stage == CrowdsaleStage.Ongoing, "ERRD_MUST_ONG");																																									// ICO must be ongoing
		require(!s.useBlacklist || !s.blacklisted[msg.sender], 'ERRD_MUSN_BLK');																																			// must not be blacklisted
		require(uUSDAmount >= s.minuUSDTransfer, "ERRD_TRAS_LOW");																																										// transfer amount too low
		require(uUSDAmount <= s.maxuUSDTransfer, "ERRD_TRAS_HIG");																																										// transfer amount too high
		require((s.contributions[msg.sender].uUSDInvested +uUSDAmount < s.whitelistuUSDThreshold) || s.whitelisted[msg.sender], 'ERRD_MUST_WHI');			// must be whitelisted
		require(s.contributions[msg.sender].uUSDInvested +uUSDAmount <= s.maxuUSDInvestment, "ERRD_INVT_HIG");																				// total invested amount too high
		require(uUSDAmount + s.totaluUSDTInvested < s.hardCapuUSD, "ERRD_HARD_CAP");																																	// amount higher than available

		// add investor
		if(!s.contributions[msg.sender].known) {
			s.investors.push(msg.sender);
			s.contributions[msg.sender].known = true;
		}

		// add contribution to investor
		s.contributions[msg.sender].conts[symbol].cAmountInvested += rawAmountWitDecimals;	// only for refund
		s.contributions[msg.sender].conts[symbol].cuUSDInvested += uUSDAmount;							// only for audit

		// add total to investor
		s.contributions[msg.sender].uUSDToPay += uUSDAmount;																// only for claim
		s.contributions[msg.sender].uUSDInvested += uUSDAmount;															// only for max investment

		// add total to payment method
		s.paymentTokens[symbol].ptuUSDInvested += uUSDAmount;																// only for audit
		s.paymentTokens[symbol].ptAmountInvested += rawAmountWitDecimals;										// only for audit

		// add total
		s.totaluUSDTInvested += uUSDAmount;																									// lifecycle

		emit FundsReceived(msg.sender, symbol, rawAmountWitDecimals);

		// move tokens if tokens investment
		if (keccak256(bytes(symbol)) != COIN) {
			require(IERC20Upgradeable(s.paymentTokens[symbol].ptTokenAddress).allowance(msg.sender, address(this)) >= rawAmountWitDecimals, "ERRD_ALLO_LOW");				// insuffient allowance
			IERC20Upgradeable(s.paymentTokens[symbol].ptTokenAddress).safeTransferFrom(msg.sender, address(this), rawAmountWitDecimals);
		}

	}
	event FundsReceived (address backer, string symbol, uint amount);

	/********************************************************************************************************/
	/**************************************************** Refund ********************************************/
	/********************************************************************************************************/
	function refund(string calldata symbol) external nonReentrant {
		refundInvestor(symbol, msg.sender);
	}
	function refundAddress(string calldata symbol, address investor) external nonReentrant onlyOwner {
		refundInvestor(symbol, investor);
	}
	function refundInvestor(string calldata symbol, address investor) internal {
		require(s.stage == CrowdsaleStage.Finished, "ERRR_MUST_FIN");																																									// ICO must be finished
		require(s.totaluUSDTInvested < s.softCapuUSD, "ERRR_PASS_SOF");																																									// Passed SoftCap. No refund
		require(investor !=  address(0), "ERRW_INVA_ADD");
		uint256 rawAmount = s.contributions[investor].conts[symbol].cAmountInvested;
		require(rawAmount > 0, "ERRR_ZERO_REF");																																																		// Nothing to refund

		// clear variables
		s.contributions[investor].uUSDToPay -= s.contributions[investor].conts[symbol].cuUSDInvested;
		delete s.contributions[investor].conts[symbol];

		emit FundsRefunded(investor, symbol, rawAmount);

		// do refund
		if (keccak256(bytes(symbol)) == COIN) {
			//slither-disable-next-line low-level-calls
			(bool success, ) = payable(investor).call{ value: rawAmount }("");
			require(success, "ERRR_WITH_REF");																																																			// Unable to refund

		} else {
			IERC20Upgradeable(s.paymentTokens[symbol].ptTokenAddress).safeTransfer(investor, rawAmount);
		}

	}
	event FundsRefunded(address _backer, string symbol, uint _amount);

	/********************************************************************************************************/
	/**************************************************** Claim *********************************************/
	/********************************************************************************************************/
	function claim() external nonReentrant {
		claimInvestor(msg.sender);
	}
	function claimAddress(address investor) external onlyOwner {
		claimInvestor(investor);
	}
	function claimInvestor(address investor) internal {
		require(s.stage == CrowdsaleStage.Finished, "ERRC_MUST_FIN");																																									// ICO must be finished
		require(s.totaluUSDTInvested > s.softCapuUSD, "ERRC_NPAS_SOF");																																								// Not passed SoftCap
		require(investor !=  address(0), "ERRW_INVA_ADD");
		require(s.tokenAddress != address(0x0) || s.percentVested == 100, "ERRC_MISS_TOK");																														// Provide Token
		require(s.vestingAddress != address(0x0) || s.percentVested == 0, "ERRC_MISS_VAD");																														// Provide Vesting Token

		uint claimed = s.contributions[investor].uUSDToPay * 10**18 / s.uUsdPrice;
		require(claimed > 0, "ERRR_ZERO_CLM");																																																				// Nothing to refund

		// clear variables
		s.contributions[investor].uUSDToPay = 0;
		uint paymentSymbolsLength = s.paymentSymbols.length;
		for (uint i = 0; i < paymentSymbolsLength; i++) {
			if(s.contributions[investor].conts[s.paymentSymbols[i]].cAmountInvested != 0) {
				s.contributions[investor].conts[s.paymentSymbols[i]].cAmountInvested = 0;
				s.contributions[investor].conts[s.paymentSymbols[i]].cuUSDInvested = 0;
			}
		}

		emit FundsClaimed(investor, claimed);

		console.log('msg.sender', msg.sender);

		// unvested claim
		if (s.percentVested < 100)
			IERC20Upgradeable(s.tokenAddress).safeTransfer(investor, claimed * (100 - s.percentVested) / 100);
			
		// vested claim
		if (s.percentVested > 0) {
			IVestingFacet(s.vestingAddress).createVestingSchedule(investor, claimed, s.vestingId);
			IERC20Upgradeable(s.tokenAddress).safeTransfer(s.vestingAddress, claimed * s.percentVested / 100);
		}
	}
	event FundsClaimed(address backer, uint amount);

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

	// vesting
	function getPercentVested() external view returns (uint256) {
		return s.percentVested;
	}
	function getVestingId() external view returns (uint256) {
		return s.vestingId;
	}

	// vesting Address
	function setVestingAddress(address add) external onlyOwner {
		require(add !=  address(0), "ERRW_INVA_ADD");

		s.vestingAddress = add;
	
		emit UpdatedVestingAddress(add);
	}
	event UpdatedVestingAddress(address add);

	function getVestingAddress() external view returns (address) {
		return s.vestingAddress;
	}

	/********************************************************************************************************/
	/*************************************************** Withdraw *******************************************/
	/********************************************************************************************************/
	function withdraw(string calldata symbol, uint8 percentage) external nonReentrant onlyOwner {
		require(s.totaluUSDTInvested > s.softCapuUSD, "ERRW_NPAS_SOF");																																								// Not passed SoftCap
		require(s.targetWalletAddress != address(0x0), "ERRW_MISS_WAL");																																							// Provide Wallet

		s.paymentTokens[symbol].ptuUSDInvested -= s.paymentTokens[symbol].ptuUSDInvested * percentage / 100;
		s.paymentTokens[symbol].ptAmountInvested -= s.paymentTokens[symbol].ptAmountInvested * percentage / 100;

		if (keccak256(bytes(symbol)) == COIN) {
			uint amount = address(this).balance;
			require(amount > 0, "ERRR_ZERO_WIT");																																																				// Nothing to withdraw

			//slither-disable-next-line low-level-calls
			(bool success, ) = s.targetWalletAddress.call{ value: amount * percentage / 100 }("");
			require(success, "ERRR_WITH_BAD");																																																					// Unable to withdraw
			emit FundsWithdrawn(symbol, amount);

		} else {
			address paymentTokenAddress = s.paymentTokens[symbol].ptTokenAddress;
			uint amount = IERC20Upgradeable(paymentTokenAddress).balanceOf(address(this));
			require(amount > 0, "ERRR_ZERO_WIT");																																																				// Nothing to withdraw

			IERC20Upgradeable(paymentTokenAddress).safeTransfer(s.targetWalletAddress, amount * percentage / 100 );
			emit FundsWithdrawn(symbol, amount);
		}
	}
	event FundsWithdrawn(string symbol, uint amount);

	// targetWalletAddress
	function setTargetWalletAddress(address payable add) external onlyOwner {
		require(add !=  address(0), "ERRW_INVA_ADD");

		s.targetWalletAddress = add;

		emit UpdatedTargetWalletAddress(add);
	}
	event UpdatedTargetWalletAddress(address payable add);

	function getTargetWalletAddress() external view returns (address) {
		return s.targetWalletAddress;
	}

}
