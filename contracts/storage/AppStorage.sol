// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

struct PaymentToken {
	address ptTokenAddress;
	address ptPriceFeed;
	uint256 ptUUSD_PER_TOKEN;
	uint8 ptDecimals;
	uint256 ptuUSDInvested;
	uint256 ptAmountInvested;
}

// contributions
struct Contribution { 				// only for refund
	uint256 cAmountInvested;		// only for refund				// reset on claim / refund
	uint256 cuUSDInvested;			// only for audit					// reset on claim / refund
}
struct Contributions {
	bool known;
	uint256 uUSDToPay;					// for claim and deposits	// reset on claim / refund
	uint256 uUSDInvested;				// for max investment			// no reset
	mapping (string => Contribution) conts;
}

enum CrowdsaleStage {
	NotStarted,
	Ongoing,
	OnHold,
	Finished
}

struct AppStorage {

	uint8 _initialized;																		// no reset
	bool _initializing;																		// no reset
	address _owner;																				// no reset
	address _pendingOwner;																// no reset

	// antiwhale variables
	uint256 whitelistuUSDThreshold;
	address[] whitelistedAccs;
	mapping(address => bool) whitelisted;
	bool useBlacklist;
	address[] blacklistedAccs;
	mapping(address => bool) blacklisted;
	mapping(address => bool) excludedFromMaxInvestment;
	uint256 maxuUSDInvestment;
	mapping(address => bool) excludedFromMaxTransfer;
	uint256 maxuUSDTransfer;
	uint256 minuUSDTransfer;

	// crowdsale variables
	CrowdsaleStage stage;
	string[] paymentSymbols;															// no reset
	bool dynamicPrice;																		// no reset
	mapping (string => PaymentToken) paymentTokens;				// no reset
	uint256 totaluUSDTInvested;														// reset on claim / refund
	uint256 hardCapuUSD;																	// manual reset
	uint256 softCapuUSD;																	// manual reset
	uint256 uUsdPrice;
	address[] investors;																	// no reset
	mapping (address => Contributions) contributions;			// reset on claim / refund
	address payable tokenAddress;													// manual reset
	address payable targetWalletAddress;									// manual reset

	// erc-20 variables
	string _name;
	string _symbol;
	uint256 _totalSupply;
	mapping(address => uint256) _balances;
	mapping(address => mapping(address => uint256)) _allowances;


}