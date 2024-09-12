	// **********************************************************************************************************************************
	// ******************************************************** Deprecated. Done from UI ************************************************
	// **********************************************************************************************************************************

import { ethers } from "hardhat";
import hre from 'hardhat'
import * as helpers from "../test/_testhelper";

async function main() {
	await helpers.extractAbi();

	// accounts
	const [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
	console.log('owner - address: %s ; balance: %s', 0, owner.address, await ethers.provider.getBalance(owner.address));
	[owner, addr1, addr2, addr3, ...addrs].forEach(async(account, i) => {
		if (account == undefined) {
			console.log('addr%d - address: %s ; balance: %s', ++i, "undefined", "?");
			return;
		}
		let balance = await ethers.provider.getBalance(account.address);
		console.log('addr%d - address: %s ; balance: %s', ++i, account.address, balance);
	});

	// network
	const networkName = hre.network.name
	console.log("network:", networkName);

	// inspect network
	const cryptocommoditiesFactory = await ethers.getContractAt('CryptocommoditiesFactory', '<CryptocommoditiesFactoryAddress>');
	const diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', '<DiamondCutFacet>');
	const diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', '<DiamondLoupeFacet>');
	const commonFacet = await ethers.getContractAt('CommonFacet', '<CommonFacet>');
	const crowdsaleFacet = await ethers.getContractAt('CrowdsaleFacet', '<CrowdsaleFacet>');
	const vestingFacet = await ethers.getContractAt('VestingFacet', '<VestingFacet>');
	const erc20Facet = await ethers.getContractAt('ERC20Facet', '<ERC20Facet>');

	// **********************************************************************************************************************************
	// ************************************************************* Deploy *************************************************************
	// **********************************************************************************************************************************
			// deploy DiamondCutFacet
			/*const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet')
			let diamondCutFacet = await DiamondCutFacet.deploy()
			await diamondCutFacet.deployed()
			console.log('DiamondCutFacet deployed:', diamondCutFacet.address)*/

	// deploy Diamond
	const Diamond = await ethers.getContractFactory('Diamond')
	let diamond = await Diamond.deploy(diamondCutFacet.address)
	await diamond.deployed()
	console.log('Diamond deployed:', diamond.address)
	let diamondCutContract = await ethers.getContractAt('DiamondCutFacet', diamond.address)

			// deploy DiamondLoupeFacet *****************************************
			/*const DiamondLoupeFacet = await ethers.getContractFactory('DiamondLoupeFacet')
			let diamondLoupeFacet = await DiamondLoupeFacet.deploy()
			await diamondLoupeFacet.deployed()
			let diamondLoupeContract = await ethers.getContractAt('DiamondLoupeFacet', diamond.address)
			console.log('DiamondLoupeFacet deployed:', diamondLoupeFacet.address)*/

	// attach DiamondLoupeFacet
	let _diamondCut = [{ facetAddress: diamondLoupeFacet.address, action: helpers.FacetCutAction.Add, functionSelectors: helpers.getSelectors(diamondLoupeFacet), }];
	await diamondCutContract.diamondCut(_diamondCut);
	console.log("DiamondLoupeFacet attached as " + diamondCutContract.address);

			// deploy Common facet
			/*let CommonFacet = await ethers.getContractFactory("CommonFacet");
			let commonFacet = await CommonFacet.deploy();
			await commonFacet.deployed();
			let common = await ethers.getContractAt('CommonFacet', diamond.address)
			console.log("CommonFacet deployed:" + commonFacet.address);*/

	// attach Common facet *****************************************
	console.log('attachig functions:', helpers.getSelectors(commonFacet))
	_diamondCut = [{ facetAddress: commonFacet.address, action: helpers.FacetCutAction.Add, functionSelectors: helpers.getSelectors(commonFacet), }];
	await diamondCutContract.diamondCut(_diamondCut);
	//console.log("CommonFacet attached as " + common.address);

			/*/ deploy Crowdsale facet
			/let CrowdsaleFacet = await ethers.getContractFactory("CrowdsaleFacet");
			let crowdsaleFacet = await CrowdsaleFacet.deploy();
			await crowdsaleFacet.deployed();
			let ico = await ethers.getContractAt('CrowdsaleFacet', diamond.address)
			console.log("CrowdsaleFacet deployed:" + crowdsaleFacet.address);*/

	// attach Crowdsale facet ex Common
	const crowdsaleFacetExCommonFacetSelectors: Array<string> = helpers.removeSelectors(helpers.getSelectors(crowdsaleFacet), helpers.getSelectors(commonFacet));
	//crowdsaleFacetExCommonFacetSelectors.push(commonFacet.interface.getSighash('receive()'))
	console.log('attachig functions:', crowdsaleFacetExCommonFacetSelectors)
	_diamondCut = [{ facetAddress: crowdsaleFacet.address, action: helpers.FacetCutAction.Add, functionSelectors: crowdsaleFacetExCommonFacetSelectors, }];
	await diamondCutContract.diamondCut(_diamondCut);
	//console.log("CrowdsaleFacet attached as " + ico.address);

			// deploy Vesting facet *****************************************
			/*let VestingFacet = await ethers.getContractFactory("VestingFacet");
			let vestingFacet = await VestingFacet.deploy();
			await vestingFacet.deployed();
			let vesting = await ethers.getContractAt('VestingFacet', diamond.address)
			console.log("VestingFacet deployed: " + vestingFacet.address);*/

	// attach Vesting facet ex Common
	const vestingFacetExCommonFacetSelectors: Array<string> = helpers.removeSelectors(helpers.getSelectors(vestingFacet), helpers.getSelectors(commonFacet));
	console.log('attachig functions:', vestingFacetExCommonFacetSelectors)
	_diamondCut = [{ facetAddress: vestingFacet.address, action: helpers.FacetCutAction.Add, functionSelectors: vestingFacetExCommonFacetSelectors, }];
	await diamondCutContract.diamondCut(_diamondCut);
	//console.log("VestingFacet attached as " + vesting.address);

			// deploy Token facet *****************************************
			/*let ERC20Facet = await ethers.getContractFactory("ERC20Facet");
			let erc20Facet = await ERC20Facet.deploy();
			await erc20Facet.deployed();
			let token = await ethers.getContractAt('ERC20Facet', diamond.address)
			console.log("ERC20Facet deployed:" + erc20Facet.address);*/

	// attach Token facet ex Common
	const erc20FacetExCommonFacetSelectors: Array<string> = helpers.removeSelectors(helpers.getSelectors(erc20Facet), helpers.getSelectors(commonFacet));
	console.log('attachig functions:', erc20FacetExCommonFacetSelectors)
	_diamondCut = [{ facetAddress: erc20Facet.address, action: helpers.FacetCutAction.Add, functionSelectors: erc20FacetExCommonFacetSelectors, }];
	await diamondCutContract.diamondCut(_diamondCut);
	//console.log("ERC20Facet attached as " + token.address);

	// initialize
	console.log('initializing')
	console.log(await diamondLoupeFacet.facetFunctionSelectors(erc20Facet.address));	 // fetching storage is needed before token.initialize. I do not know why				
	await diamond.initialize("CatallacticERC20", "CATA", BigInt(200_000_000 * 10**18));
	await diamond.setPaymentToken("COIN", diamond.address, "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", Math.floor(1100*1e6), 18);
	console.log('ico.owner()', await diamond.owner());
	await diamond.setTokenAddress(diamond.address);
	await diamond.setVestingAddress(diamond.address);
	await diamond.setTargetWalletAddress(diamond.address);
	await diamond.addGrantor(diamond.address);
	await diamond.setReceiveFacet(diamond.address);
	console.log('initialized');

}

// ****************************************************************************
// ***************************** Helper Functions *****************************
// ****************************************************************************
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
