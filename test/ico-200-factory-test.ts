import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import * as helpers from "./_testhelper";

describe("ico-200-factory-test", function () {
	const hre = require("hardhat");

	let owner: SignerWithAddress, project: SignerWithAddress, liquidity: SignerWithAddress;
	let addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addrs;
	let chainLinkAggregator: Contract, cryptocommoditiesFactory: Contract, diamondLoupeContract: Contract, common: Contract, ico: Contract,  vesting: Contract, token: Contract;

	/********************************************************************************************************/
	/************************************************** hooks ***********************************************/
	/********************************************************************************************************/
	before(async() => {
		console.log('*******************************');
		console.log('******** Starting Tests *******');
		console.log('*******************************');
	});

	beforeEach(async() => {
		//console.log('--------------------');
		await hre.network.provider.send("hardhat_reset");

		// ***********************************************************************************************************************************************************
		// ************************************************************************** Install Environment ************************************************************
		// ***********************************************************************************************************************************************************
		// get accounts
		[owner, project, liquidity, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
		[owner, project, liquidity, addr1, addr2, addr3, ...addrs].forEach(async(account, i) => {
			let balance = await ethers.provider.getBalance(account.address);
			console.log('%d - address: %s ; balance: %s', ++i, account.address, balance);
		});

		// deploy ChainLinkAggregator mock
		const ChainLinkAggregator = await ethers.getContractFactory("DemoMockAggregator", owner);
		chainLinkAggregator = await ChainLinkAggregator.deploy();
		await chainLinkAggregator.deployed();
		console.log("ChainLinkAggregator:" + chainLinkAggregator.address);

		// deploy CryptocommoditiesFactory
		const CryptocommoditiesFactory = await ethers.getContractFactory("CryptocommoditiesFactory", owner);
		cryptocommoditiesFactory = await CryptocommoditiesFactory.deploy();
		await cryptocommoditiesFactory.deployed();
		console.log("CryptocommoditiesFactory:" + cryptocommoditiesFactory.address);

		// ***********************************************************************************************************************************************************
		// ********************************************************* Install Versionable Facets and register in factory **********************************************
		// ***********************************************************************************************************************************************************
		// deploy DiamondCutFacet (CUD)
		const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet')
		let diamondCutFacet = await DiamondCutFacet.deploy()
		await diamondCutFacet.deployed()
		console.log('DiamondCutFacet deployed:', diamondCutFacet.address)

		// deploy DiamondLoupeFacet (R)
		const DiamondLoupeFacet = await ethers.getContractFactory('DiamondLoupeFacet')
		let diamondLoupeFacet = await DiamondLoupeFacet.deploy()
		await diamondLoupeFacet.deployed()
		console.log('DiamondLoupeFacet deployed:', diamondLoupeFacet.address)

		// deploy Common Facet
		const CommonFacet = await ethers.getContractFactory("CommonFacet");
		let commonFacet = await CommonFacet.deploy();
		await commonFacet.deployed();
		console.log("CommonFacet deployed:" + commonFacet.address);

		// deploy Crowdsale Facet
		const CrowdsaleFacet = await ethers.getContractFactory("CrowdsaleFacet");
		let crowdsaleFacet = await CrowdsaleFacet.deploy();
		await crowdsaleFacet.deployed();
		console.log("CrowdsaleFacet deployed:" + crowdsaleFacet.address);

		// deploy Vesting facet
		const VestingFacet = await ethers.getContractFactory("VestingFacet");
		let vestingFacet = await VestingFacet.deploy();
		await vestingFacet.deployed();
		console.log("VestingFacet deployed: " + vestingFacet.address);

		// deploy Token Facet
		const ERC20Facet = await ethers.getContractFactory("ERC20Facet");
		let erc20Facet = await ERC20Facet.deploy();
		await erc20Facet.deployed();
		console.log("ERC20Facet deployed:" + erc20Facet.address);

		// ***********************************************************************************************************************************************************
		// *********************************************************  Create Cryptocommodity Contract ****************************************************************
		// ***********************************************************************************************************************************************************
		// Create Cryptocommodity inside factory and allocate to owner in factory
		// ***********************************************************************************************************************************************************
		// deploy Diamond Cryptocommodity
		
		// without factory
		/*const Diamond = await ethers.getContractFactory('Diamond')
		let diamond = await Diamond.deploy(diamondCutFacet.address)
		await diamond.deployed()
		console.log('Diamond deployed:', diamond.address)*/

		// populate factory
		await expect(cryptocommoditiesFactory.setFacet('DiamondCutFacet', 1.0, diamondCutFacet.address)).to.not.be.reverted;
		await expect(cryptocommoditiesFactory.setFacet('DiamondLoupeFacet', 1.0, diamondLoupeFacet.address)).to.not.be.reverted;
		await expect(cryptocommoditiesFactory.setFacet('CommonFacet', 1.0, commonFacet.address)).to.not.be.reverted;
		await expect(cryptocommoditiesFactory.setFacet('CrowdsaleFacet', 1.0, crowdsaleFacet.address)).to.not.be.reverted;
		await expect(cryptocommoditiesFactory.setFacet('VestingFacet', 1.0, vestingFacet.address)).to.not.be.reverted;
		await expect(cryptocommoditiesFactory.setFacet('ERC20Facet', 1.0, erc20Facet.address)).to.not.be.reverted;

		// with factory
		await expect(cryptocommoditiesFactory.createCryptocommodity(owner.address, 'TEST')).to.not.be.reverted;
		let diamondAddress = await cryptocommoditiesFactory.getCryptocommodity(owner.address, 'TEST');
		console.log('Diamond Address:', diamondAddress)
		let diamond = await ethers.getContractAt('Diamond', diamondAddress);

		// ***********************************************************************************************************************************************************
		// *********************************************************** Configure Cryptocommodity Contract ************************************************************
		// ***********************************************************************************************************************************************************
		// Attach Facets to Cryptocommodity via DiamondCut in UI
		// ***********************************************************************************************************************************************************
		const diamondCutContract = await ethers.getContractAt('DiamondCutFacet', diamond.address)

		// attach DiamondLoupeFacet
		const diamondLoupeFacetSelectors = helpers.getSelectors(diamondLoupeFacet);
		let _diamondCut = [{ facetAddress: diamondLoupeFacet.address, action: helpers.FacetCutAction.Add, functionSelectors: diamondLoupeFacetSelectors, }];
		await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;
    diamondLoupeContract = await ethers.getContractAt('DiamondLoupeFacet', diamond.address)
		console.log("DiamondLoupeFacet attached as " + diamondCutContract.address);

		// attach Common facet
		const commonFacetSelectors = helpers.getSelectors(commonFacet);
		_diamondCut = [{ facetAddress: commonFacet.address, action: helpers.FacetCutAction.Add, functionSelectors: commonFacetSelectors, }];
		await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;
		common = await ethers.getContractAt('CommonFacet', diamond.address)
		console.log("CommonFacet attached as " + common.address);

		// attach Crowdsale facet ex Common
		const crowdsaleFacetExCommonFacetSelectors = helpers.removeSelectors(helpers.getSelectors(crowdsaleFacet), helpers.getSelectors(commonFacet));
		_diamondCut = [{ facetAddress: crowdsaleFacet.address, action: helpers.FacetCutAction.Add, functionSelectors: crowdsaleFacetExCommonFacetSelectors, }];
		await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;
		ico = await ethers.getContractAt('CrowdsaleFacet', diamond.address)
		console.log("CrowdsaleFacet attached as " + ico.address);

		// attach Vesting facet ex Common
		const vestingFacetExCommonFacetSelectors = helpers.removeSelectors(helpers.getSelectors(vestingFacet), helpers.getSelectors(commonFacet));
		_diamondCut = [{ facetAddress: vestingFacet.address, action: helpers.FacetCutAction.Add, functionSelectors: vestingFacetExCommonFacetSelectors, }];
		await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;
    vesting = await ethers.getContractAt('VestingFacet', diamond.address)
		console.log("VestingFacet attached as " + vesting.address);

		// attach Token facet ex Common
		const erc20FacetExCommonFacetSelectors = helpers.removeSelectors(helpers.getSelectors(erc20Facet), helpers.getSelectors(commonFacet));
		_diamondCut = [{ facetAddress: erc20Facet.address, action: helpers.FacetCutAction.Add, functionSelectors: erc20FacetExCommonFacetSelectors, }];
		await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;
    token = await ethers.getContractAt('ERC20Facet', diamond.address)
		console.log("ERC20Facet attached as " + token.address);

		// Initialize Cryptocommodity in UI
		// ***********************************************************************************************************************************************************
		console.log('initializing')
		await expect(diamond.setReceiveFacet(crowdsaleFacet.address)).to.not.be.reverted;
		await expect(common.setStorage(helpers.STORAGE1)).not.to.be.reverted;
		await expect(await common.owner()).to.equal('0x0000000000000000000000000000000000000000');
		await expect(token.initialize("CatallacticERC20", "CATA", BigInt(200_000_000 * 10**18))).not.to.be.reverted;
		await expect(vesting.createVesting('abc', Date.now(), helpers.TIME.MILLIS_IN_MONTH, helpers.TIME.MILLIS_IN_YEAR, 12)).not.to.be.reverted;
		await expect(ico.createCrowdsale(30_000, 300_000_000_000, 50_000_000_000, 1_000_000_000, 100_000_000_000, 100_000_000_000, 9_999_999, 90, 'abc')).not.to.be.reverted;
		await expect(ico.setPaymentToken("FOO", ico.address, chainLinkAggregator.address, Math.floor(1100*1e6), 18)).not.to.be.reverted;
		await expect(await common.owner()).to.equal(owner.address);
		console.log('initialized');

	});

	afterEach(async() => {
		await helpers.logICOStatus(ico);
		console.log('--------------------');
	});
	
	after(async() => {
		console.log('--------- Ending Tests --------');
	});

	/********************************************************************************************************/
	/********************************************* supporting functions *************************************/
	/********************************************************************************************************/
	it("Initial Logs.", async() => {

		//console.log("\tgetMaxTransfer: " + weiToUsd(await ico.getMaxTransfer()) + " USD");
		//console.log("\tgetMinTransfer: " + weiToUsd(await ico.getMinTransfer()) + " USD");
		//console.log("\tgetMaxInvestment: " + weiToUsd(await ico.getMaxInvestment()) + " USD");
		//console.log("\tgetHardCap: " + weiToUsd(await ico.getHardCap()) + " USD")

		console.log("\n");
		console.log("Addresses:");
		console.log("\towner address: " + owner.address);
		console.log("\tico address: " + ico.address);
		console.log("\tico owner address: " + await ico.owner());
		console.log("\ttoken address: " + token.address);
		console.log("\ttoken owner address: " + await token.owner());
		console.log("\ttoken owner balance: " + await token.balanceOf(await token.owner()));
		console.log("\tproject address: " + project.address);
		console.log("\tliquidity address: " + liquidity.address);
		console.log("\n");

	});

});
