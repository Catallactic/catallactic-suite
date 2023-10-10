import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import * as helpers from "./_testhelper";

describe("ico-213-factory-all-token-nok-test", function () {
	const hre = require("hardhat");

	let owner: SignerWithAddress, project: SignerWithAddress, liquidity: SignerWithAddress;
	let addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addrs;
	let chainLinkAggregator: Contract, foo: Contract, cryptocommoditiesFactory: Contract, diamondLoupeContract: Contract, common: Contract, ico: Contract, token: Contract;

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

		const FOO = await ethers.getContractFactory("FOO");
		foo = await FOO.deploy("FOO", "FOO");
		await foo.deployed();
		console.log("deployed FOO:" + foo.address);

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

		// populate factory
		await expect(cryptocommoditiesFactory.setFacet('DiamondCutFacet', 1.0, diamondCutFacet.address)).to.not.be.reverted;
		await expect(cryptocommoditiesFactory.setFacet('DiamondLoupeFacet', 1.0, diamondLoupeFacet.address)).to.not.be.reverted;
		await expect(cryptocommoditiesFactory.setFacet('CommonFacet', 1.0, commonFacet.address)).to.not.be.reverted;
		await expect(cryptocommoditiesFactory.setFacet('CrowdsaleFacet', 1.0, crowdsaleFacet.address)).to.not.be.reverted;
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

		// attach Token facet ex Common
		const erc20FacetExCommonFacetSelectors = helpers.removeSelectors(helpers.getSelectors(erc20Facet), helpers.getSelectors(commonFacet));
		_diamondCut = [{ facetAddress: erc20Facet.address, action: helpers.FacetCutAction.Add, functionSelectors: erc20FacetExCommonFacetSelectors, }];
		await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;
    token = await ethers.getContractAt('ERC20Facet', diamond.address)
		console.log("ERC20Facet attached as " + token.address);

		// Initialize Cryptocommodity in UI
		// ***********************************************************************************************************************************************************
		console.log('initializing')
		await expect(common.setStorage(helpers.STORAGE1)).not.to.be.reverted;
		await expect(await common.owner()).to.equal('0x0000000000000000000000000000000000000000');
		await expect(token.initialize("CatallacticERC20", "CATA", BigInt(200_000_000 * 10**18))).not.to.be.reverted;
		await expect(ico.createCrowdsale(30_000, 300_000_000_000, 50_000_000_000, 1_000_000_000, 100_000_000_000, 100_000_000_000, 9_999_999, 90, 'abc')).not.to.be.reverted;
		await expect(ico.setPaymentToken("FOO", ico.address, chainLinkAggregator.address, Math.floor(1100*1e6), 18)).not.to.be.reverted;
		await expect(diamond.setReceiveFacet(crowdsaleFacet.address)).to.not.be.reverted;
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
		//console.log("\tgetHardCap: " + weiToUsd(await ico.getHardCap()) + " USD");

		console.log("\n");
		console.log("Addresses:");
		console.log("\towner address: " + owner.address);
		console.log("\tico address: " + ico.address);
		console.log("\tico owner address: " + await ico.owner());
		console.log("\ttoken address: " + token.address);
		console.log("\ttoken owner address: " + await token.owner());
		console.log("\ttoken owner balance: " + await token.balanceOf(await token.owner()));
		console.log("\tfoo token address: " + foo.address);
		//console.log("\tfoo token owner address: " + await foo.owner());
		console.log("\tproject address: " + project.address);
		console.log("\tliquidity address: " + liquidity.address);
		console.log("\taddr1 address: " + addr1.address);
		console.log("\taddr2 address: " + addr2.address);
		console.log("\taddr3 address: " + addr3.address);
		console.log("\n");

	});

	it("Should configure FOO token .", async() => {

		console.log('FOO: ');
		await ico.setPaymentToken("FOO", foo.address, foo.address, Math.floor(258.1*1e6), 18);
		let FOO = await ico.getPaymentToken('FOO');
		console.log(FOO);
		expect(FOO[0]).to.equal(foo.address);
		expect(FOO[1]).to.equal(foo.address);
		expect(FOO[2]).to.equal(Math.floor(258.1*1e6));
		expect(FOO[3]).to.equal(18);

	});

	/********************************************************************************************************/
	/******************************************* Token Distribution *****************************************/
	/********************************************************************************************************/
	it("Should deliver tokens to test accounts.", async() => {
		
		// check initial balance of creator
		let totalSupply = ethers.utils.parseUnits("21000000", 18).toString();
		expect(await foo.balanceOf(owner.address)).to.equal(totalSupply, 'Tokens should be assigned to owner');

		// transfer to test users
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		expect(await foo.balanceOf(addr1.address)).to.equal(amountToTransfer, 'Tokens should be assigned to addr1');
		await foo.transfer(addr2.address, amountToTransfer);
		expect(await foo.balanceOf(addr2.address)).to.equal(amountToTransfer, 'Tokens should be assigned to addr2');
		await foo.transfer(addr3.address, amountToTransfer);
		expect(await foo.balanceOf(addr3.address)).to.equal(amountToTransfer, 'Tokens should be assigned to addr3');

	});

	/********************************************************************************************************/
	/****************************************** Payment Tokens **********************************************/
	/********************************************************************************************************/
	it("Should update PaymentTokens", async() => {

		await ico.setCrowdsaleStage(helpers.STAGE.ONGOING);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await expect(helpers.testTransferToken(addr1, 'FOO', 10, ico, foo)).not.to.be.reverted;
		expect((await ico.getPaymentToken("FOO"))[4]).to.equal(10000000, 'Invested amount must be accounted');																			// uUSDInvested
		expect((await ico.getPaymentToken("FOO"))[5]).to.equal(BigInt((1 * 38744672607516470).toString()), 'Invested amount must be accounted');		// amountInvested			

		await expect(helpers.testTransferToken(addr2, 'FOO', 10, ico, foo)).not.to.be.reverted;
		expect((await ico.getPaymentToken("FOO"))[4]).to.equal(2 * 10000000, 'Invested amount must be accounted');																	// uUSDInvested
		expect((await ico.getPaymentToken("FOO"))[5]).to.equal(BigInt((2 * 38744672607516470).toString()), 'Invested amount must be accounted');		// amountInvested

		await expect(helpers.testTransferToken(addr3, 'FOO', 10, ico, foo)).not.to.be.reverted;
		expect((await ico.getPaymentToken("FOO"))[4]).to.equal(3 * 10000000, 'Invested amount must be accounted');																	// uUSDInvested
		//expect((await ico.getPaymentToken("FOO"))[5]).to.equal(BigInt((3 * 38744672607516470).toString()), 'Invested amount must be accounted');	// amountInvested
	});

	it("Should allow dynamic prices", async() => {

		await ico.setCrowdsaleStage(helpers.STAGE.ONGOING);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(4*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		// use default price
		await expect(helpers.testTransferToken(addr1, 'FOO', 10, ico, foo)).not.to.be.reverted;
		expect((await ico.getPaymentToken("FOO"))[4]).to.equal(10 * 10**6, 'Invested amount must be accounted');																		// uUSDInvested
		expect((await ico.getPaymentToken("FOO"))[5]).to.equal(BigInt((2.5 * 10**18).toString()), 'Invested amount must be accounted');							// amountInvested

		// use dynamic price - same price
		await ico.setDynamicPrice(true);
		await chainLinkAggregator.setDynamicPrice(4);
		await expect(helpers.testTransferToken(addr1, 'FOO', 10, ico, foo)).not.to.be.reverted;
		expect((await ico.getPaymentToken("FOO"))[4]).to.equal(2 * 10 * 10**6, 'Invested amount must be accounted');																// uUSDInvested
		expect((await ico.getPaymentToken("FOO"))[5]).to.equal(BigInt((2 * 2.5 * 10**18).toString()), 'Invested amount must be accounted');					// amountInvested

		// use dynamic price - double price
		await ico.setDynamicPrice(true);
		await chainLinkAggregator.setDynamicPrice(8);
		await expect(helpers.testTransferToken(addr1, 'FOO', 10, ico, foo)).not.to.be.reverted;
		expect((await ico.getPaymentToken("FOO"))[4]).to.equal(4 * 10 * 10**6, 'Invested amount must be accounted');																// uUSDInvested
		expect((await ico.getPaymentToken("FOO"))[5]).to.equal(BigInt((3 * 2.5 * 10**18).toString()), 'Invested amount must be accounted');					// amountInvested

		// use dynamic price - double price
		await ico.setDynamicPrice(true);
		await chainLinkAggregator.setDynamicPrice(0);
		await expect(helpers.testTransferToken(addr1, 'FOO', 10, ico, foo)).not.to.be.reverted;
		expect((await ico.getPaymentToken("FOO"))[4]).to.equal(5 * 10 * 10**6, 'Invested amount must be accounted');																	// uUSDInvested
		expect((await ico.getPaymentToken("FOO"))[5]).to.equal(BigInt((8.75 * 10**18).toString()), 'Invested amount must be accounted');		// amountInvested

	});

	/********************************************************************************************************/
	/********************************************** Investors ***********************************************/
	/********************************************************************************************************/
	it("Should count investors", async() => {

		await ico.setCrowdsaleStage(helpers.STAGE.ONGOING);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await expect(helpers.testTransferToken(addr1, 'FOO', 10, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr2, 'FOO', 10, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr3, 'FOO', 10, ico, foo)).not.to.be.reverted;

		let investorsCount = await ico.getInvestorsCount();
		expect(investorsCount).to.equal(3, 'Investors not counted correctly');
		let investors = await ico.getInvestors();
		for (let i = 0; i < investorsCount; i++) {
			let uusdContributedBy = await ico.getuUSDToClaim(investors[i]);
			console.log('usdContributedBy ' + uusdContributedBy);
			expect(uusdContributedBy).to.equal(10 * 1e6, 'Investor USD contributed is wrong');
		}

		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(10 * 1e6, 'Investor USD contributed is wrong');
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(10 * 1e6, 'Investor USD contributed is wrong');
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(10 * 1e6, 'Investor USD contributed is wrong');
	});

	/********************************************************************************************************/
	/************************************************ Deposit ***********************************************/
	/********************************************************************************************************/
	// normal
	it("Should be able to deposit", async() => {
		await ico.setCrowdsaleStage(helpers.STAGE.ONGOING);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(4*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		// update balances
		await expect(() => helpers.testTransferToken(addr1, 'FOO', 10, ico, foo))
			.to.changeTokenBalances(foo, [ico, addr1], [BigInt((await helpers.usdToTokenWithDecimals(10, ico)).toString()), BigInt((-1*(await helpers.usdToTokenWithDecimals(10, ico))).toString())]);

		// update counters
		expect(await ico.getContribution(addr1.address, 'FOO')).to.equal(BigInt(await helpers.usdToTokenWithDecimals(10, ico)));																						// cAmountInvested
		expect(await ico.getuUSDContribution(addr1.address, 'FOO')).to.equal(10 * 10**6);																																			// cuUSDInvested
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(10 * 10**6, 'Investor USD contributed is wrong');																						// uUSDToPay
		expect((await ico.getPaymentToken("FOO"))[4]).to.equal(10 * 10**6, 'Invested amount must be accounted');																							// uUSDInvested
		expect((await ico.getPaymentToken("FOO"))[5]).to.equal(BigInt((await helpers.usdToTokenWithDecimals(10, ico)).toString()), 'Investor USD contributed is wrong');		// amountInvested
		expect(await ico.getTotaluUSDInvested()).to.equal(10 * 10**6);																																												// totaluUSDTInvested
		
	});

	// normal
	it("Should be able to deposit only if Ongoing", async() => {

		await ico.setCrowdsaleStage(helpers.STAGE.NOT_STARTED);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await expect(helpers.testTransferToken(addr1, 'FOO', 10, ico, foo)).to.be.revertedWith(helpers.ERRORS.ERRD_MUST_ONG);

		// bug overflow -> workaround use BigInt
		// bug BigInt -> workaround use to String() https://stackoverflow.com/questions/70968922/assigning-bigint-stores-wrong-number-number1
		await ico.setCrowdsaleStage(helpers.STAGE.ONGOING);
		await expect(() => helpers.testTransferToken(addr1, 'FOO', 10, ico, foo))
			.to.changeTokenBalances(foo, [ico, addr1], [BigInt((await helpers.usdToTokenWithDecimals(10, ico)).toString()), BigInt((-1*(await helpers.usdToTokenWithDecimals(10, ico))).toString())]);

		await ico.setCrowdsaleStage(helpers.STAGE. ONHOLD);
		await expect(helpers.testTransferToken(addr1, 'FOO', 10, ico, foo)).to.be.revertedWith(helpers.ERRORS.ERRD_MUST_ONG)
		
		await ico.setCrowdsaleStage(helpers.STAGE.FINISHED);
		await expect(helpers.testTransferToken(addr1, 'FOO', 10, ico, foo)).to.be.revertedWith(helpers.ERRORS.ERRD_MUST_ONG);
	});

	it("Should be able to whitelist and unwhitelist", async() => {
		await ico.setCrowdsaleStage(helpers.STAGE.ONGOING);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		// whitelisting enabled, small transfer
		await ico.setWhitelistuUSDThreshold(30 * 10**6);
		await ico.unwhitelistUser(addr1.address);
		await expect(helpers.testTransferToken(addr1, 'FOO', 31, ico, foo)).to.be.revertedWith(helpers.ERRORS.ERRD_MUST_WHI);
		await ico.whitelistUser(addr1.address);
		await expect(helpers.testTransferToken(addr1, 'FOO', 31, ico, foo)).not.to.be.reverted;
	});

	it("Should be able to blacklist and unblacklist", async() => {
		await ico.setCrowdsaleStage(helpers.STAGE.ONGOING);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await ico.setUseBlacklist(false);
		await ico.blacklistUser(addr1.address);
		await expect(helpers.testTransferToken(addr1, 'FOO', 10, ico, foo)).not.to.be.reverted;

		await ico.setUseBlacklist(true);
		await ico.blacklistUser(addr1.address);
		await expect(helpers.testTransferToken(addr1, 'FOO', 10, ico, foo)).to.be.revertedWith(helpers.ERRORS.ERRD_MUSN_BLK);

		await ico.setUseBlacklist(true);
		await ico.unblacklistUser(addr1.address);
		await expect(helpers.testTransferToken(addr1, 'FOO', 10, ico, foo)).not.to.be.reverted;

		await ico.setUseBlacklist(false);
	});

	// min transfer
	it("Should respect transfer limits", async() => {
		await ico.setCrowdsaleStage(helpers.STAGE.ONGOING);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await ico.setMinuUSDTransfer(9.9999 * 10**6);
		await expect(helpers.testTransferToken(addr1, 'FOO', 9, ico, foo)).to.be.revertedWith(helpers.ERRORS.ERRD_TRAS_LOW);
		await expect(helpers.testTransferToken(addr1, 'FOO', 10, ico, foo)).not.to.be.reverted;
		await ico.setMinuUSDTransfer(9.99 * 10**6);

		await ico.setMaxuUSDTransfer(20.0001 * 10**6);
		await expect(helpers.testTransferToken(addr1, 'FOO', 21, ico, foo)).to.be.revertedWith(helpers.ERRORS.ERRD_TRAS_HIG);
		await expect(helpers.testTransferToken(addr1, 'FOO', 20, ico, foo)).not.to.be.reverted;
		await ico.setMaxuUSDTransfer(10_000.001  * 10**6);

		console.log("getuUSDToClaim: " + await ico.getuUSDToClaim(addr1.address));
		await ico.setMaxuUSDInvestment(50 * 10**6);
		await expect(helpers.testTransferToken(addr1, 'FOO', 10, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr1, 'FOO', 10, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr1, 'FOO', 40, ico, foo)).to.be.revertedWith(helpers.ERRORS.ERRD_INVT_HIG);
		await ico.setMaxuUSDInvestment(10_001 * 10**6);

	});

	// beyond hard cap
	it("Should not be able to deposit beyond caps", async() => {
		await ico.setCrowdsaleStage(helpers.STAGE.ONGOING);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await ico.setMaxuUSDTransfer(21 * 10**6);
		await ico.setMaxuUSDInvestment(80 * 10**6);
		await ico.setHardCapuUSD(100 * 10**6);
		await expect(helpers.testTransferToken(addr1, 'FOO', 20, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr1, 'FOO', 20, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr1, 'FOO', 20, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr2, 'FOO', 20, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr2, 'FOO', 20, ico, foo)).to.be.revertedWith(helpers.ERRORS.ERRD_HARD_CAP);
		await ico.setMaxuUSDTransfer(10_000 * 10**6);
		await ico.setMaxuUSDInvestment(10_000 * 10**6);
	});

	it("Should update ICO balance", async() => {
		await ico.setCrowdsaleStage(helpers.STAGE.ONGOING);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await expect(helpers.testTransferToken(addr1, 'FOO', 10, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr2, 'FOO', 10, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr3, 'FOO', 10, ico, foo)).not.to.be.reverted;

		let contributed1 = await ico.getContribution(addr1.address, "FOO");
		expect(contributed1).to.equal(BigInt((await helpers.usdToTokenWithDecimals(10, ico)).toString()));
		let contributed2 = await ico.getContribution(addr2.address, "FOO");
		expect(contributed2).to.equal(BigInt((await helpers.usdToTokenWithDecimals(10, ico)).toString()));
		let contributed3 = await ico.getContribution(addr3.address, "FOO");
		expect(contributed3).to.equal(BigInt((await helpers.usdToTokenWithDecimals(10, ico)).toString()));
		let totalContributed = contributed1.add(contributed2).add(contributed3);
		let balanceOfICO = await foo.balanceOf(ico.address);
		console.log("balance " + balanceOfICO);
		expect(balanceOfICO).to.equal(totalContributed);
	});

	it("Should be able to do big transactions", async() => {
		await ico.setCrowdsaleStage(helpers.STAGE.ONGOING);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		// do big transaction
		await ico.whitelistUser(addr1.address);
		await ico.setMaxuUSDTransfer(4_000_000 * 10**6);
		await ico.setMaxuUSDInvestment(4_000_000 * 10**6);
		await ico.setHardCapuUSD(4_000_000 * 10**6);
		await expect(helpers.testTransferToken(addr1, 'FOO', 3_000_000, ico, foo)).not.to.be.reverted;
		await expect(await ico.getuUSDContribution(addr1.address, "FOO")).to.equal(3_000_000_000_000);
	});

	/********************************************************************************************************/
	/************************************************** Refund **********************************************/
	/********************************************************************************************************/
	it("Should be able to refund Tokens to investor", async() => {

		await ico.setCrowdsaleStage(helpers.STAGE.ONGOING);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await expect(helpers.testTransferToken(addr1, 'FOO', 10, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr2, 'FOO', 10, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr3, 'FOO', 10, ico, foo)).not.to.be.reverted;

		await ico.setCrowdsaleStage(helpers.STAGE.FINISHED);

		let contributed1 = await ico.getContribution(addr1.address, "FOO");
		console.log("refunding " + contributed1);
		await expect(() => ico.connect(addr1).refund("FOO"))
			.to.changeTokenBalances(foo, [ico, addr1], [contributed1.mul(-1), contributed1]);
		expect(await ico.getContribution(addr1.address, "FOO")).to.equal(0);
		expect(await ico.getuUSDContribution(addr1.address, "FOO")).to.equal(0);
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(0);

		let contributed2 = await ico.getContribution(addr2.address, "FOO");
		await expect(() => ico.connect(addr2).refund("FOO"))
			.to.changeTokenBalances(foo, [ico, addr2], [contributed2.mul(-1), contributed2]);
		expect(await ico.getContribution(addr2.address, "FOO")).to.equal(0);
		expect(await ico.getuUSDContribution(addr2.address, "FOO")).to.equal(0);
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(0);

		let contributed3 = await ico.getContribution(addr3.address, "FOO");
		await expect(() => ico.connect(addr3).refund("FOO"))
			.to.changeTokenBalances(foo, [ico, addr3], [contributed3.mul(-1), contributed3]);
		expect(await ico.getContribution(addr3.address, "FOO")).to.equal(0);
		expect(await ico.getuUSDContribution(addr3.address, "FOO")).to.equal(0);
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(0);

		console.log("balanceOfICO " + await ethers.provider.getBalance(ico.address));
		expect(await foo.balanceOf(ico.address)).to.equal(0);

	});

	it("Should be able to refund all Tokens", async() => {

		await ico.setCrowdsaleStage(helpers.STAGE.ONGOING);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await expect(helpers.testTransferToken(addr1, 'FOO', 10, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr2, 'FOO', 10, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr3, 'FOO', 10, ico, foo)).not.to.be.reverted;

		await ico.setCrowdsaleStage(helpers.STAGE.FINISHED);

		// refund all
		let contributed1 = await ico.getContribution(addr1.address, "FOO");
		await expect(() => ico.refundAddress("FOO", addr1.address)).to.changeTokenBalances(foo, [ico, addr1], [contributed1.mul(-1), contributed1]);
		await expect(await ico.getContribution(addr1.address, "FOO")).to.equal(0);
		await expect(await ico.getuUSDToClaim(addr1.address)).to.equal(0);
		let contributed2 = await ico.getContribution(addr2.address, "FOO");
		await expect(() => ico.refundAddress("FOO", addr2.address)).to.changeTokenBalances(foo, [ico, addr2], [contributed2.mul(-1), contributed2]);
		await expect(await ico.getContribution(addr2.address, "FOO")).to.equal(0);
		await expect(await ico.getuUSDToClaim(addr2.address)).to.equal(0);
		let contributed3 = await ico.getContribution(addr3.address, "FOO");
		await expect(() => ico.refundAddress("FOO", addr3.address)).to.changeTokenBalances(foo, [ico, addr3], [contributed3.mul(-1), contributed3]);
		await expect(await ico.getContribution(addr3.address, "FOO")).to.equal(0);
		await expect(await ico.getuUSDToClaim(addr3.address)).to.equal(0);

		expect(await ethers.provider.getBalance(ico.address)).to.equal(0);
		
	});

	/********************************************************************************************************/
	/************************************************** Reset Refund ****************************************/
	/********************************************************************************************************/
	it("Should be able to Reset Refund", async() => {

		await ico.setCrowdsaleStage(helpers.STAGE.ONGOING);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await expect(helpers.testTransferToken(addr1, 'FOO', 10, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr2, 'FOO', 10, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr3, 'FOO', 10, ico, foo)).not.to.be.reverted;

		await ico.setCrowdsaleStage(helpers.STAGE.FINISHED);

		let contributed1 = await ico.getContribution(addr1.address, "FOO");
		console.log("refunding " + contributed1);
		await expect(() => ico.connect(addr1).refund("FOO"))
			.to.changeTokenBalances(foo, [ico, addr1], [contributed1.mul(-1), contributed1]);
		expect(await ico.getContribution(addr1.address, "FOO")).to.equal(0);
		expect(await ico.getuUSDContribution(addr1.address, "FOO")).to.equal(0);
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(0);

		let contributed2 = await ico.getContribution(addr2.address, "FOO");
		await expect(() => ico.connect(addr2).refund("FOO"))
			.to.changeTokenBalances(foo, [ico, addr2], [contributed2.mul(-1), contributed2]);
		expect(await ico.getContribution(addr2.address, "FOO")).to.equal(0);
		expect(await ico.getuUSDContribution(addr2.address, "FOO")).to.equal(0);
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(0);

		let contributed3 = await ico.getContribution(addr3.address, "FOO");
		await expect(() => ico.connect(addr3).refund("FOO"))
			.to.changeTokenBalances(foo, [ico, addr3], [contributed3.mul(-1), contributed3]);
		expect(await ico.getContribution(addr3.address, "FOO")).to.equal(0);
		expect(await ico.getuUSDContribution(addr3.address, "FOO")).to.equal(0);
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(0);

		console.log("balanceOfICO " + await ethers.provider.getBalance(ico.address));
		expect(await foo.balanceOf(ico.address)).to.equal(0);

		// verify finish
		expect(await ico.owner()).to.equal(owner.address);
		expect(await ico.getCrowdsaleStage()).to.equal(helpers.STAGE.FINISHED, 'The stage couldn\'t be set to Finished');
		expect(await ico.getTotaluUSDInvested()).to.equal(30000000);																																		// totaluUSDTInvested
		expect(await ico.getHardCap()).to.equal(300000);
		expect(await ico.getSoftCap()).to.equal(50000);
		expect(await ico.getPriceuUSD()).to.equal(30_000);
		expect(await ico.getPercentVested()).to.equal(90);
		expect(await ico.getVestingId()).to.equal('abc');
		expect(await ico.getInvestorsCount()).to.equal(3);
		let investorsCount = await ico.getInvestorsCount();
		let investors = await ico.getInvestors();
		for (let i = 0; i < investorsCount; i++) {
			expect(await ico.getuUSDToClaim(investors[i])).to.equal(0);
			expect(await ico.getuUSDInvested(investors[i])).to.equal(10000000);
			expect(await ico.getContribution(addr1.address, 'FOO')).to.equal(0);																														// cAmountInvested
			expect(await ico.getuUSDContribution(addr1.address, 'FOO')).to.equal(0);																												// cuUSDInvested
		}
		expect(await ico.getTokenAddress()).to.equal('0x0000000000000000000000000000000000000000', 'token address should be zero');				// tokenAddress
		expect(await ico.getTargetWalletAddress()).to.equal('0x0000000000000000000000000000000000000000', 'token address should be zero');// targetWalletAddress

		// reset
		await ico.reset();

		// verify reset
		expect(await ico.owner()).to.equal(owner.address);
		expect(await ico.getCrowdsaleStage()).to.equal(helpers.STAGE.NOT_CREATED, 'The stage couldn\'t be set to Not Created');
		expect(await ico.getTotaluUSDInvested()).to.equal(0);																																							// totaluUSDTInvested
		expect(await ico.getHardCap()).to.equal(0);
		expect(await ico.getSoftCap()).to.equal(0);
		expect(await ico.getPriceuUSD()).to.equal(0);
		expect(await ico.getPercentVested()).to.equal(0);
		expect(await ico.getVestingId()).to.equal('');
		expect(await ico.getInvestorsCount()).to.equal(3);
		investorsCount = await ico.getInvestorsCount();
		investors = await ico.getInvestors();
		for (let i = 0; i < investorsCount; i++) {
			expect(await ico.getuUSDToClaim(investors[i])).to.equal(0);
			expect(await ico.getuUSDInvested(investors[i])).to.equal(10000000);
			expect(await ico.getContribution(addr1.address, 'FOO')).to.equal(0);																														// cAmountInvested
			expect(await ico.getuUSDContribution(addr1.address, 'FOO')).to.equal(0);																												// cuUSDInvested
		}
		expect(await ico.getTokenAddress()).to.equal('0x0000000000000000000000000000000000000000', 'token address should be zero');				// tokenAddress
		expect(await ico.getTargetWalletAddress()).to.equal('0x0000000000000000000000000000000000000000', 'token address should be zero');// targetWalletAddress

	});

});
