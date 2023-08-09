import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { DiamondCutFacet, DiamondLoupeFacet, OwnershipFacet, Test1Facet, Test2Facet } from '../typechain';

// describe.skip
describe("framework-2-cachebug-test", function () {
	


	/********************************************************************************************************/
	/************************************************** hooks ***********************************************/
	/********************************************************************************************************/
	before(async() => {
		console.log('-------- Starting Tests -------');


	});

	beforeEach(async() => {
		console.log('--------------------');
	});

	afterEach(async() => {
		console.log('--------------------');
	});
	
	after(async() => {
		console.log('--------- Ending Tests --------');
	});

	/********************************************************************************************************/
	/********************************************** DiamondLoupe ********************************************/
	/********************************************************************************************************/
	describe('DiamondLoupe', () => {

	});

});