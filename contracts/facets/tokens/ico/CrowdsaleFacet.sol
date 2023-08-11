// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "../../features/security/ReentrancyGuardUpgradeableNoStorage.sol";
import "../../features/security/AntiWhale.sol";
import "../../features/security/LibAntiWhaleStorage.sol";
import "../../features/lifecycle/InitializableNoStorage.sol";

import "./LibCrowdsaleStorage.sol";
import "hardhat/console.sol";

contract CrowdsaleFacet is AntiWhale, ReentrancyGuardUpgradeableNoStorage {
	using SafeERC20Upgradeable for IERC20Upgradeable;

	LibCrowdsaleStorage.MyStruct internal s;

	function initialize() public initializer {
		console.log('Owner is ', msg.sender);
    __Ownable_init();
		console.log('Owner is ', owner());

		// initialization
		console.log('**************************************************');
		console.log('**************** Initialize ICO ******************');
		console.log('**************************************************');

		s.totaluUSDTInvested = 0;
		s.hardCapuUSD = 300_000_000_000;
		s.softCapuUSD = 50_000_000_000;
		s.dynamicPrice = false;

		w.whitelistuUSDThreshold = 1_000_000_000;
		w.maxuUSDInvestment = 100_000_000_000;
		w.maxuUSDTransfer = 100_000_000_000;
		w.minuUSDTransfer = 9_999_999;
	}

	/********************************************************************************************************/
	/************************************************* Lifecycle ********************************************/
	/********************************************************************************************************/
	// Crowdsale Stage
	function getCrowdsaleStage() external view returns (CrowdsaleStage) {
		return stage;
	}
	enum CrowdsaleStage {
		NotStarted,
		Ongoing,
		OnHold,
		Finished
	}
	CrowdsaleStage private stage = CrowdsaleStage.NotStarted;
	function setCrowdsaleStage(uint stage_) external onlyOwner {
		if(uint(CrowdsaleStage.NotStarted) == stage_) {							// 0
			stage = CrowdsaleStage.NotStarted;
		} else if (uint(CrowdsaleStage.Ongoing) == stage_) {				// 1
			stage = CrowdsaleStage.Ongoing;
		} else if (uint(CrowdsaleStage.OnHold) == stage_) {					// 2
			stage = CrowdsaleStage.OnHold;
		} else if (uint(CrowdsaleStage.Finished) == stage_) {				// 3
			stage = CrowdsaleStage.Finished;
		}

		emit UpdatedCrowdsaleStage(stage_);
	}
	event UpdatedCrowdsaleStage(uint stage_);

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

	// ICO Price
	uint256 private constant UUSD_PER_TOKEN = 0.03*10**6;
	function getPriceuUSD() external pure returns (uint256) {
		return UUSD_PER_TOKEN;
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
	/******************************************* Payment Tokens *********************************************/
	/********************************************************************************************************/
	// Payment Tokens
	function getPaymentSymbols() external view returns (string[] memory) {
		return s.paymentSymbols;
	}

	function getPaymentToken(string calldata symbol) external view returns(LibCrowdsaleStorage.PaymentToken memory) {
		return s.paymentTokens[symbol];
	}
	function setPaymentToken(string calldata symbol, address tokenAdd, address priceFeed, uint256 uUSDPerTokens, uint8 decimals) external onlyOwner {
		require(tokenAdd !=  address(0), "ERRW_INVA_ADD");

		if (s.paymentTokens[symbol].ptDecimals == 0) {
			s.paymentSymbols.push(symbol);
		}

		s.paymentTokens[symbol] = LibCrowdsaleStorage.PaymentToken({
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
		require(stage == CrowdsaleStage.Ongoing, "ERRD_MUST_ONG");																																									// ICO must be ongoing
		require(!w.useBlacklist || !w.blacklisted[msg.sender], 'ERRD_MUSN_BLK');																																				// must not be blacklisted
		require(uUSDAmount >= w.minuUSDTransfer, "ERRD_TRAS_LOW");																																										// transfer amount too low
		require(uUSDAmount <= w.maxuUSDTransfer, "ERRD_TRAS_HIG");																																										// transfer amount too high
		require((s.contributions[msg.sender].uUSDToPay +uUSDAmount < w.whitelistuUSDThreshold) || w.whitelisted[msg.sender], 'ERRD_MUST_WHI');						// must be whitelisted
		require(s.contributions[msg.sender].uUSDToPay +uUSDAmount <= w.maxuUSDInvestment, "ERRD_INVT_HIG");																							// total invested amount too high
		require(uUSDAmount + s.totaluUSDTInvested < s.hardCapuUSD, "ERRD_HARD_CAP");																																		// amount higher than available

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
		require(stage == CrowdsaleStage.Finished, "ERRR_MUST_FIN");																																									// ICO must be finished
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
		require(stage == CrowdsaleStage.Finished, "ERRC_MUST_FIN");																																										// ICO must be finished
		require(s.totaluUSDTInvested > s.softCapuUSD, "ERRC_NPAS_SOF");																																										// Not passed SoftCap
		require(investor !=  address(0), "ERRW_INVA_ADD");
		require(s.tokenAddress != address(0x0), "ERRC_MISS_TOK");																																												// Provide Token

		uint claimed = s.contributions[investor].uUSDToPay * 10**18 / UUSD_PER_TOKEN;
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

		// do claim
		IERC20Upgradeable(s.tokenAddress).safeTransferFrom(owner(), investor, claimed);
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

	/********************************************************************************************************/
	/*************************************************** Withdraw *******************************************/
	/********************************************************************************************************/
	function withdraw(string calldata symbol, uint8 percentage) external nonReentrant onlyOwner {
		require(s.totaluUSDTInvested > s.softCapuUSD, "ERRW_NPAS_SOF");																																										// Not passed SoftCap
		require(s.targetWalletAddress != address(0x0), "ERRW_MISS_WAL");																																								// Provide Wallet

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
