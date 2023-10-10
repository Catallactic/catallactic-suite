// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "../suite/framework/Diamond.sol";
import "../suite/framework/DiamondCutFacet.sol";

contract CryptocommoditiesFactory {

	// facetsRegistry
	mapping(string => mapping(uint256 => address)) facetsRegistry;

	function setFacet(string calldata facetType, uint256 facetVersion, address facetAddress) external {
		facetsRegistry[facetType][facetVersion] = facetAddress;
	}

	function getFacet(string calldata facetType, uint256 facetVersion) external view returns(address) {
		return facetsRegistry[facetType][facetVersion];
	}

	// cryptocommodities
	mapping(address => mapping(string => address)) cryptocommodities;

	function createCryptocommodity(address crytocommodityOwner, string calldata crytocommodityName) external {
		require(cryptocommodities[crytocommodityOwner][crytocommodityName] == address(0), 'Existing cryptocommodity');

		address diamondCutFacetAddress = facetsRegistry['DiamondCutFacet'][1];
		Diamond diamond = new Diamond(diamondCutFacetAddress);
		cryptocommodities[crytocommodityOwner][crytocommodityName] = address(diamond);
	}

	function getCryptocommodity(address crytocommodityOwner, string calldata crytocommodityName) external view returns(address) {
		return cryptocommodities[crytocommodityOwner][crytocommodityName];
	}

}
