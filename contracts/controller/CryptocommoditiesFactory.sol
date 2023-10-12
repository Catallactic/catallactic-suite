// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "../suite/framework/Diamond.sol";
import "../suite/framework/DiamondCutFacet.sol";

contract CryptocommoditiesFactory {


	fallback() external payable {
    console.log("----- fallback:", msg.value);
  }

	receive() external payable {
		console.log("----- receive:", msg.value);
	}

	/********************************************************************************************************/
	/****************************************** Facets Registry *********************************************/
	/********************************************************************************************************/
	string[] facetTypes;

	mapping(string => string[]) facetVersions;

	mapping(string => mapping(string => address)) facetsRegistry;

	function getFacetTypes() external view returns(string[] memory) {
		return facetTypes;
	}

	function getFacetAddress(string calldata facetType, string calldata facetVersion) external view returns(address) {
		return facetsRegistry[facetType][facetVersion];
	}

	function setFacetVersion(string calldata facetType, string calldata facetVersion, address facetAddress) external {
		require(facetsRegistry[facetType][facetVersion] == address(0), "ERRW_INVA_ADD");

		if(facetVersions[facetType].length == 0)
			facetTypes.push(facetType);

		facetVersions[facetType].push(facetVersion);

		facetsRegistry[facetType][facetVersion] = facetAddress;
	}

	struct FacetVersion { 
		string facetVersion;
		address facetAddress;
	}

	function getFacetVersions(string calldata facetType) external view returns (FacetVersion[] memory) {
		uint arrayLength = facetVersions[facetType].length;
		FacetVersion[] memory response = new FacetVersion[](arrayLength);

		for (uint i = 0; i < arrayLength; i++) {

			response[i] = FacetVersion({
											facetVersion: facetVersions[facetType][i],
											facetAddress: facetsRegistry[facetType][facetVersions[facetType][i]]
										});

		}

		return response;
	}

	/********************************************************************************************************/
	/******************************************* Payment Tokens *********************************************/
	/********************************************************************************************************/
	struct PaymentToken {
		address ptTokenAddress;
		address ptPriceFeed;
		uint256 ptUUSD_PER_TOKEN;
		uint8 ptDecimals;
		uint256 ptuUSDInvested;
		uint256 ptAmountInvested;
	}
	string[] paymentSymbols;															// no reset
	mapping (string => PaymentToken) paymentTokens;				// no reset

	// Payment Tokens
	function getPaymentSymbols() external view returns (string[] memory) {
		return paymentSymbols;
	}

	function getPaymentToken(string calldata symbol) external view returns(PaymentToken memory) {
		return paymentTokens[symbol];
	}
	function setPaymentToken(string calldata symbol, address tokenAdd, address priceFeed, uint256 uUSDPerTokens, uint8 decimals) external /*onlyOwner*/ {
		require(tokenAdd !=  address(0), "ERRW_INVA_ADD");

		if (paymentTokens[symbol].ptDecimals == 0) {
			paymentSymbols.push(symbol);
		}

		paymentTokens[symbol] = PaymentToken({
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

	function deletePaymentToken(string calldata symbol, uint8 index) external /*onlyOwner*/ {
		require(keccak256(bytes(symbol)) == keccak256(bytes(paymentSymbols[index])), "ERRP_INDX_PAY");

		delete paymentTokens[symbol];

		paymentSymbols[index] = paymentSymbols[paymentSymbols.length - 1];
		paymentSymbols.pop();

		emit DeletedPaymentToken(symbol);
	}
	event DeletedPaymentToken(string symbol);

	/********************************************************************************************************/
	/******************************************* Cryptocommodities ******************************************/
	/********************************************************************************************************/
	mapping(address => string[]) cryptocommoditiesByAccount;

	function getCryptocommodities() external view returns(string[] memory) {
		return cryptocommoditiesByAccount[msg.sender];
	}

	function getCryptocommoditiesByAddress(address crytocommodityOwner) external view returns(string[] memory) {
		return cryptocommoditiesByAccount[crytocommodityOwner];
	}

	mapping(string => address) cryptocommodities;

	function createCryptocommodity(string calldata crytocommodityName) external {
		require(cryptocommodities[crytocommodityName] == address(0), 'Existing cryptocommodity');

		address diamondCutFacetAddress = facetsRegistry['DiamondCutFacet']['1.0'];
		Diamond diamond = new Diamond(diamondCutFacetAddress);

		cryptocommoditiesByAccount[msg.sender].push(crytocommodityName);
		cryptocommodities[crytocommodityName] = address(diamond);
	}

	function getCryptocommodity(string calldata crytocommodityName) external view returns(address) {
		return cryptocommodities[crytocommodityName];
	}

}
