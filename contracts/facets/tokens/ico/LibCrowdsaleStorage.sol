// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.18;

import "hardhat/console.sol";

library LibCrowdsaleStorage {

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

  struct MyStruct {
		uint256 totaluUSDTInvested;
		uint256 hardCapuUSD;
		uint256 softCapuUSD;
		//uint256 UUSD_PER_TOKEN;
		string[] paymentSymbols;
		bool dynamicPrice;
		mapping (string => PaymentToken) paymentTokens;
		address[] investors;
		mapping (address => Contributions) contributions;
		address payable tokenAddress;
		address payable targetWalletAddress;
  }


	// define slot for this storage 
  bytes32 constant LIB_ICO_STORAGE_POSITION = keccak256("com.mycompany.projectx.mystruct");

  function libCatallacticICOStorage() internal pure returns (MyStruct storage mystruct) {
    bytes32 position = LIB_ICO_STORAGE_POSITION;
    assembly {
      mystruct.slot := position
    }
  }

}