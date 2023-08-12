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
	uint256 cAmountInvested;		// only for refund
	uint256 cuUSDInvested;			// only for audit
}
struct Contributions {
	bool known;
	uint256 uUSDToPay;					// for claim and deposits
	mapping (string => Contribution) conts;
}

struct AppStorage {

	uint8 _initialized;
	bool _initializing;

	address _owner;
	address _pendingOwner;

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

	string[] paymentSymbols;
	bool dynamicPrice;
	mapping (string => PaymentToken) paymentTokens;
	uint256 totaluUSDTInvested;
	uint256 hardCapuUSD;
	uint256 softCapuUSD;
	//uint256 UUSD_PER_TOKEN;
	address[] investors;
	mapping (address => Contributions) contributions;
	address payable tokenAddress;
	address payable targetWalletAddress;

	mapping(address => uint256) _balances;
	mapping(address => mapping(address => uint256)) _allowances;
	uint256 _totalSupply;
	string _name;
	string _symbol;

}