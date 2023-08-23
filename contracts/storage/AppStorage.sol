// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;


struct Role {
	mapping (address => bool) bearer;
}

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

struct Vesting {
	uint256 start;																												// start time of the vesting period in seconds since the UNIX epoch
	uint256 cliff;																												// cliff time of the vesting start in seconds since the UNIX epoch
	uint256 duration;																											// duration of the vesting period in seconds
	uint256 slicePeriodSeconds;																						// duration of a slice period for the vesting in seconds
}
struct VestingSchedule {
	address beneficiary;																									// beneficiary of tokens after they are released
	uint256 amountTotal;																									// total amount of tokens to be released at the end of the vesting
	uint256 vestingId;																										// vesting id

	uint256 released;																											// amount of tokens released
}

struct AppStorage {

	uint8 _initialized;																		// no reset
	bool _initializing;																		// no reset
	address _owner;																				// no reset
	address _pendingOwner;																// no reset

  Role _grantors;

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
	uint256 uUsdPrice;																		// manual reset
	address[] investors;																	// no reset
	mapping (address => Contributions) contributions;			// reset on claim / refund
	address payable tokenAddress;													// manual reset
	address payable targetWalletAddress;									// manual reset
	address vestingAddress;																// manual reset
	uint256 percentVested;																// manual reset
	uint256 vestingId;																		// manual reset

	// vesting
	uint256[] vestingIds;
	mapping(uint256 => Vesting) vestings;
	uint256[] vestingSchedulesIds;
	mapping(uint256 => VestingSchedule) vestingSchedules;

	// erc-20 variables
	string _name;
	string _symbol;
	uint256 _totalSupply;
	mapping(address => uint256) _balances;
	mapping(address => mapping(address => uint256)) _allowances;
	mapping(address => uint256) holdersVestingCount;
	uint256 vestingSchedulesTotalAmount;

}