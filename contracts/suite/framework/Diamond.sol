// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
*
* Implementation of a diamond.
/******************************************************************************/

import { LibDiamond } from "./LibDiamond.sol";
import { IDiamondCut } from "./IDiamondCut.sol";
import { LibDiamondStorage } from "./LibDiamondStorage.sol";

import "hardhat/console.sol";

contract Diamond {    

    constructor(address _diamondCutFacet) payable {        

			// Add the diamondCut external function from the diamondCutFacet
			IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](1);
			bytes4[] memory functionSelectors = new bytes4[](1);
			functionSelectors[0] = IDiamondCut.diamondCut.selector;
			cut[0] = IDiamondCut.FacetCut({ facetAddress: _diamondCutFacet, action: IDiamondCut.FacetCutAction.Add, functionSelectors: functionSelectors });
			LibDiamond.executeDiamondCut(cut);
			
    }

    // Find facet for function that is called and execute the
    // function if a facet is found and return any value.
    fallback() external payable {

			// get facet from function selector
			address facet = LibDiamondStorage.diamondStorage().selectorToFacetAndPosition[msg.sig].facetAddress;
			require(facet != address(0), "Diamond: Function does not exist");

			// Execute external function from facet using delegatecall and return any value.
			assembly {
				// copy function selector and any arguments
				calldatacopy(0, 0, calldatasize())
				// execute function call using the facet
				let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
				// get any return value
				returndatacopy(0, 0, returndatasize())
				// return any return value or error back to the caller
				switch result
					case 0 {
						revert(0, returndatasize())
					}
					default {
						return(0, returndatasize())
					}
			}
    }

    receive() external payable {

			// get diamond storage
			LibDiamondStorage.DiamondStorage storage ds;
			bytes32 position = LibDiamondStorage.DIAMOND_STORAGE_POSITION;
			assembly {
				ds.slot := position
			}
		
			require(ds.receiveFacet !=  address(0), "Diamond: Address cannot be null");

			// get facet from function selector
			address facet = ds.receiveFacet;

			// Execute external function from facet using delegatecall and return any value.
			assembly {
				// copy function selector and any arguments
				calldatacopy(0, 0, calldatasize())
				// execute function call using the facet
				let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
				// get any return value
				returndatacopy(0, 0, returndatasize())
				// return any return value or error back to the caller
				switch result
					case 0 {
						revert(0, returndatasize())
					}
					default {
						return(0, returndatasize())
					}
			}
		}

		function setReceiveFacet(address payable receiveFacet_) external {
			require(receiveFacet_ !=  address(0), "Diamond: Address cannot be null");

			LibDiamondStorage.DiamondStorage storage ds;
			bytes32 position = LibDiamondStorage.DIAMOND_STORAGE_POSITION;
			assembly {
				ds.slot := position
			}

			console.log('setReceiveFacet', receiveFacet_);
			ds.receiveFacet = receiveFacet_;
		}
}
