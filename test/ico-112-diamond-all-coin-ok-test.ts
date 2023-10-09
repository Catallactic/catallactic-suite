import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import * as helpers from "./_testhelper";

describe("ico-112-diamond-all-coin-ok-test", function () {
	const hre = require("hardhat");

	let owner: SignerWithAddress, project: SignerWithAddress, liquidity: SignerWithAddress;
	let addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addrs;
	let chainLinkAggregator: Contract, common: Contract, ico: Contract, vesting: Contract, token: Contract;

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

		// deploy DiamondCutFacet
		const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet')
		let diamondCutFacet = await DiamondCutFacet.deploy()
		await diamondCutFacet.deployed()
		console.log('DiamondCutFacet deployed:', diamondCutFacet.address)

		// deploy Diamond
		const Diamond = await ethers.getContractFactory('Diamond')
		let diamond = await Diamond.deploy(diamondCutFacet.address)
		await diamond.deployed()
		console.log('Diamond deployed:', diamond.address)
		const diamondCutContract = await ethers.getContractAt('DiamondCutFacet', diamond.address)

		// deploy DiamondLoupeFacet
		const DiamondLoupeFacet = await ethers.getContractFactory('DiamondLoupeFacet')
		let diamondLoupeFacet = await DiamondLoupeFacet.deploy()
		await diamondLoupeFacet.deployed()
    const diamondLoupeContract = await ethers.getContractAt('DiamondLoupeFacet', diamond.address)
		console.log('DiamondLoupeFacet deployed:', diamondLoupeFacet.address)

		// attach DiamondLoupeFacet
		let _diamondCut = [{ facetAddress: diamondLoupeFacet.address, action: helpers.FacetCutAction.Add, functionSelectors: helpers.getSelectors(diamondLoupeFacet), }];
		await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;
		console.log("DiamondLoupeFacet attached as " + diamondCutContract.address);

		// deploy Common facet
		const CommonFacet = await ethers.getContractFactory("CommonFacet");
		let commonFacet = await CommonFacet.deploy();
		await commonFacet.deployed();
		common = await ethers.getContractAt('CommonFacet', diamond.address)
		console.log("CommonFacet deployed:" + commonFacet.address);

		// attach Common facet
		//console.log('attachig functions:', getSelectors(commonFacet))
		_diamondCut = [{ facetAddress: commonFacet.address, action: helpers.FacetCutAction.Add, functionSelectors: helpers.getSelectors(commonFacet), }];
		await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;
		console.log("CommonFacet attached as " + common.address);

		// deploy Crowdsale facet
		const CrowdsaleFacet = await ethers.getContractFactory("CrowdsaleFacet");
		let crowdsaleFacet = await CrowdsaleFacet.deploy();
		await crowdsaleFacet.deployed();
		ico = await ethers.getContractAt('CrowdsaleFacet', diamond.address)
		console.log("CrowdsaleFacet deployed:" + crowdsaleFacet.address);

		// attach Crowdsale facet ex Common
		const crowdsaleFacetExCommonFacetSelectors = helpers.removeSelectors(helpers.getSelectors(crowdsaleFacet), helpers.getSelectors(commonFacet));
		//crowdsaleFacetExCommonFacetSelectors.push(commonFacet.interface.getSighash('receive()'))
		//console.log('attachig functions:', crowdsaleFacetExCommonFacetSelectors)
		_diamondCut = [{ facetAddress: crowdsaleFacet.address, action: helpers.FacetCutAction.Add, functionSelectors: crowdsaleFacetExCommonFacetSelectors, }];
		await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;
		console.log("CrowdsaleFacet attached as " + ico.address);

		// deploy Vesting facet
		const VestingFacet = await ethers.getContractFactory("VestingFacet");
		let vestingFacet = await VestingFacet.deploy();
		await vestingFacet.deployed();
    vesting = await ethers.getContractAt('VestingFacet', diamond.address)
		console.log("VestingFacet deployed: " + vestingFacet.address);

		// attach Token facet ex Common
		const vestingFacetExCommonFacetSelectors = helpers.removeSelectors(helpers.getSelectors(vestingFacet), helpers.getSelectors(commonFacet));
		//console.log('attachig functions:', vestingFacetExCommonFacetSelectors)
		_diamondCut = [{ facetAddress: vestingFacet.address, action: helpers.FacetCutAction.Add, functionSelectors: vestingFacetExCommonFacetSelectors, }];
		await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;
		console.log("VestingFacet attached as " + vesting.address);

		// deploy Token facet
		const ERC20Facet = await ethers.getContractFactory("ERC20Facet");
		let erc20Facet = await ERC20Facet.deploy();
		await erc20Facet.deployed();
    token = await ethers.getContractAt('ERC20Facet', diamond.address)
		console.log("ERC20Facet deployed:" + erc20Facet.address);

		// attach Token facet ex Common
		const erc20FacetExCommonFacetSelectors = helpers.removeSelectors(helpers.getSelectors(erc20Facet), helpers.getSelectors(commonFacet));
		//console.log('attachig functions:', erc20FacetExCommonFacetSelectors)
		_diamondCut = [{ facetAddress: erc20Facet.address, action: helpers.FacetCutAction.Add, functionSelectors: erc20FacetExCommonFacetSelectors, }];
		await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;
		console.log("ERC20Facet attached as " + token.address);

		// initialize
		console.log('initializing')
		await expect(common.setStorage()).not.to.be.reverted;
		await expect(await common.owner()).to.equal('0x0000000000000000000000000000000000000000');
		await expect(token.initialize("CatallacticERC20", "CATA", BigInt(200_000_000 * 10**18))).not.to.be.reverted;
		await expect(vesting.createVesting('abc', Date.now(), helpers.TIME.MILLIS_IN_MONTH, helpers.TIME.MILLIS_IN_YEAR, 12)).not.to.be.reverted;
		await expect(ico.createCrowdsale(30_000, 300_000_000_000, 50_000_000_000, 1_000_000_000, 100_000_000_000, 100_000_000_000, 9_999_999, 90, 'abc')).not.to.be.reverted;
		await expect(ico.setPaymentToken("COIN", ico.address, chainLinkAggregator.address, Math.floor(1100*1e6), 18)).not.to.be.reverted;
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
		
	/********************************************************************************************************/
	/************************************************ Claim *************************************************/
	/********************************************************************************************************/
		it("Should be able to Claim Coins", async() => {
		// prepare test
		await ico.setCrowdsaleStage(helpers.STAGE.ONGOING);

		await ico.setMaxuUSDTransfer(20_000_000 * 10**6);
		await ico.setMaxuUSDInvestment(140_000_000 * 10**6);
		await ico.setWhitelistuUSDThreshold(20_000_000 * 10**6);

		await ico.setTokenAddress(token.address);
		await ico.setVestingAddress(vesting.address);
		await vesting.addGrantor(ico.address);
		await vesting.setTokenAddress(token.address);

		await expect(helpers.testTransferCoin(addr1, 19000, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr2, 19000, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr3, 19000, ico)).not.to.be.reverted;

		await ico.setCrowdsaleStage(helpers.STAGE.FINISHED);

		// claim all coins
		let price: number = await ico.getPriceuUSD();
		console.log("price " + price);

		// claim tokens from investors 1
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(19000 * 10**6);
		let uUSDContributed1 = await ico.getuUSDToClaim(addr1.address);
		let numTokensWithDecimals1 = BigInt(uUSDContributed1) * BigInt(10**18) / BigInt(price);
		expect(token.transfer(ico.address, numTokensWithDecimals1)).not.to.be.reverted;
		const unvestedNumTokensWithDecimals1 = numTokensWithDecimals1 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.connect(addr1).claim())
			.to.changeTokenBalances(token, [ico, addr1], [BigInt(-1) * unvestedNumTokensWithDecimals1, unvestedNumTokensWithDecimals1]);	// same address ico and token
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(0);
		expect(await ico.getContribution(addr1.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr1.address, 'COIN')).to.equal(0);

		// claim tokens from investors 2
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(19000 * 10**6);
		let uUSDContributed2 = await ico.getuUSDToClaim(addr2.address);
		let numTokensWithDecimals2 = BigInt(uUSDContributed2) * BigInt(10**18) / BigInt(price);
		expect(token.transfer(ico.address, numTokensWithDecimals2)).not.to.be.reverted;
		const unvestedNumTokensWithDecimals2 = numTokensWithDecimals2 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.connect(addr2).claim())
			.to.changeTokenBalances(token, [ico, addr2], [BigInt(-1) * unvestedNumTokensWithDecimals2, unvestedNumTokensWithDecimals2]);	// same address ico and token
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(0);
		expect(await ico.getContribution(addr2.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr2.address, 'COIN')).to.equal(0);

		// claim tokens from investors 3
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(19000 * 10**6);
		let uUSDContributed3 = await ico.getuUSDToClaim(addr3.address);
		let numTokensWithDecimals3 = BigInt(uUSDContributed3) * BigInt(10**18) / BigInt(price);
		expect(token.transfer(ico.address, numTokensWithDecimals3)).not.to.be.reverted;
		const unvestedNumTokensWithDecimals3 = numTokensWithDecimals3 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.connect(addr3).claim())
			.to.changeTokenBalances(token, [ico, addr3], [BigInt(-1) * unvestedNumTokensWithDecimals3, unvestedNumTokensWithDecimals3]);	// same address ico and token
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(0);
		expect(await ico.getContribution(addr3.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr3.address, 'COIN')).to.equal(0);

		// vest all tokens
		expect(await vesting.getTotalVestableAmount()).to.equal((BigInt(3) * numTokensWithDecimals1 * BigInt(90) / BigInt(100)) - BigInt(2));
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 480 * helpers.TIME.MILLIS_IN_DAY ]);

		// vest tokens from investor 1
		expect(await token.balanceOf(addr1.address)).to.equal(unvestedNumTokensWithDecimals1);
		const vestedNumTokensWithDecimals1 = numTokensWithDecimals1 * BigInt(90) / BigInt(100);																					// vested tokens
		await expect(() => vesting.connect(addr1).release(0))
			.to.changeTokenBalances(token, [vesting, addr1], [BigInt(-1) * vestedNumTokensWithDecimals1, vestedNumTokensWithDecimals1]);
		expect(await token.balanceOf(addr1.address)).to.equal(numTokensWithDecimals1 - BigInt(1));

		// vest tokens from investor 2
		expect(await token.balanceOf(addr2.address)).to.equal(unvestedNumTokensWithDecimals2);
		const vestedNumTokensWithDecimals2 = numTokensWithDecimals2 * BigInt(90) / BigInt(100);																					// vested tokens
		await expect(() => vesting.connect(addr2).release(1))
			.to.changeTokenBalances(token, [vesting, addr2], [BigInt(-1) * vestedNumTokensWithDecimals2, vestedNumTokensWithDecimals2]);
		expect(await token.balanceOf(addr2.address)).to.equal(numTokensWithDecimals2 - BigInt(1));

		// vest tokens from investor 3
		expect(await token.balanceOf(addr3.address)).to.equal(unvestedNumTokensWithDecimals3);
		const vestedNumTokensWithDecimals3 = numTokensWithDecimals3 * BigInt(90) / BigInt(100);																					// vested tokens
		await expect(() => vesting.connect(addr3).release(2))
			.to.changeTokenBalances(token, [vesting, addr3], [BigInt(-1) * vestedNumTokensWithDecimals3, vestedNumTokensWithDecimals3]);
		expect(await token.balanceOf(addr3.address)).to.equal(numTokensWithDecimals3 - BigInt(1));

	});

	it("Should be able to Claim Coins by admin", async() => {
		// prepare test
		await ico.setCrowdsaleStage(helpers.STAGE.ONGOING);

		await ico.setMaxuUSDTransfer(20_000_000 * 10**6);
		await ico.setMaxuUSDInvestment(140_000_000 * 10**6);
		await ico.setWhitelistuUSDThreshold(20_000_000 * 10**6);

		await ico.setTokenAddress(token.address);
		await ico.setVestingAddress(vesting.address);
		await vesting.addGrantor(ico.address);
		await vesting.setTokenAddress(token.address);

		await expect(helpers.testTransferCoin(addr1, 19000, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr2, 19000, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr3, 19000, ico)).not.to.be.reverted;

		await ico.setCrowdsaleStage(helpers.STAGE.FINISHED);

		let price: number = await ico.getPriceuUSD();
		console.log("price " + price);

		// claim tokens from investors 1
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(19000 * 10**6);
		let uUSDContributed1 = await ico.getuUSDToClaim(addr1.address);
		let numTokensWithDecimals1 = BigInt(uUSDContributed1) * BigInt(10**18) / BigInt(price);
		expect(token.transfer(ico.address, numTokensWithDecimals1)).not.to.be.reverted;
		const unvestedNumTokensWithDecimals1 = numTokensWithDecimals1 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.claimAddress(addr1.address))
			.to.changeTokenBalances(token, [ico, addr1], [BigInt(-1) * unvestedNumTokensWithDecimals1, unvestedNumTokensWithDecimals1]);	// same address ico and token
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(0);
		expect(await ico.getContribution(addr1.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr1.address, 'COIN')).to.equal(0);

		// claim tokens from investors 2
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(19000 * 10**6);
		let uUSDContributed2 = await ico.getuUSDToClaim(addr2.address);
		let numTokensWithDecimals2 = BigInt(uUSDContributed2) * BigInt(10**18) / BigInt(price);
		expect(token.transfer(ico.address, numTokensWithDecimals2)).not.to.be.reverted;
		const unvestedNumTokensWithDecimals2 = numTokensWithDecimals2 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.claimAddress(addr2.address))
			.to.changeTokenBalances(token, [ico, addr2], [BigInt(-1) * unvestedNumTokensWithDecimals2, unvestedNumTokensWithDecimals2]);	// same address ico and token
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(0);
		expect(await ico.getContribution(addr2.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr2.address, 'COIN')).to.equal(0);

		// claim tokens from investors 3
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(19000 * 10**6);
		let uUSDContributed3 = await ico.getuUSDToClaim(addr3.address);
		let numTokensWithDecimals3 = BigInt(uUSDContributed3) * BigInt(10**18) / BigInt(price);
		expect(token.transfer(ico.address, numTokensWithDecimals3)).not.to.be.reverted;
		const unvestedNumTokensWithDecimals3 = numTokensWithDecimals3 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.claimAddress(addr3.address))
			.to.changeTokenBalances(token, [ico, addr3], [BigInt(-1) * unvestedNumTokensWithDecimals3, unvestedNumTokensWithDecimals3]);	// same address ico and token
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(0);
		expect(await ico.getContribution(addr3.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr3.address, 'COIN')).to.equal(0);

		// vest all coins
		expect(await vesting.getTotalVestableAmount()).to.equal((BigInt(3) * numTokensWithDecimals1 * BigInt(90) / BigInt(100)) - BigInt(2));
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 480 * helpers.TIME.MILLIS_IN_DAY ]);

		// vest coins from investor 1
		expect(await token.balanceOf(addr1.address)).to.equal(unvestedNumTokensWithDecimals1);
		const vestedNumTokensWithDecimals1 = numTokensWithDecimals1 * BigInt(90) / BigInt(100);																					// vested tokens
		await expect(() => vesting.connect(addr1).release(0))
			.to.changeTokenBalances(token, [vesting, addr1], [BigInt(-1) * vestedNumTokensWithDecimals1, vestedNumTokensWithDecimals1]);
		expect(await token.balanceOf(addr1.address)).to.equal(numTokensWithDecimals1 - BigInt(1));

		// vest coins from investor 2
		expect(await token.balanceOf(addr2.address)).to.equal(unvestedNumTokensWithDecimals2);
		const vestedNumTokensWithDecimals2 = numTokensWithDecimals2 * BigInt(90) / BigInt(100);																					// vested tokens
		await expect(() => vesting.connect(addr2).release(1))
			.to.changeTokenBalances(token, [vesting, addr2], [BigInt(-1) * vestedNumTokensWithDecimals2, vestedNumTokensWithDecimals2]);
		expect(await token.balanceOf(addr2.address)).to.equal(numTokensWithDecimals2 - BigInt(1));

		// vest coins from investor 3
		expect(await token.balanceOf(addr3.address)).to.equal(unvestedNumTokensWithDecimals3);
		const vestedNumTokensWithDecimals3 = numTokensWithDecimals3 * BigInt(90) / BigInt(100);																					// vested tokens
		await expect(() => vesting.connect(addr3).release(2))
			.to.changeTokenBalances(token, [vesting, addr3], [BigInt(-1) * vestedNumTokensWithDecimals3, vestedNumTokensWithDecimals3]);
		expect(await token.balanceOf(addr3.address)).to.equal(numTokensWithDecimals3 - BigInt(1));

	});

	/********************************************************************************************************/
	/************************************************** Reset Claim *****************************************/
	/********************************************************************************************************/
	it("Should be able to Reset Claim", async() => {
		// prepare test
		await ico.setCrowdsaleStage(helpers.STAGE.ONGOING);

		await ico.setMaxuUSDTransfer(20_000_000 * 10**6);
		await ico.setMaxuUSDInvestment(140_000_000 * 10**6);
		await ico.setWhitelistuUSDThreshold(20_000_000 * 10**6);

		await ico.setTokenAddress(token.address);
		await ico.setVestingAddress(vesting.address);
		await vesting.addGrantor(ico.address);
		await vesting.setTokenAddress(token.address);

		await expect(helpers.testTransferCoin(addr1, 19000, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr2, 19000, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr3, 19000, ico)).not.to.be.reverted;

		await ico.setCrowdsaleStage(helpers.STAGE.FINISHED);

		// claim
		let price: number = await ico.getPriceuUSD();
		console.log("price " + price);

		// claim tokens from investors 1
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(19000 * 10**6);
		let uUSDContributed1 = await ico.getuUSDToClaim(addr1.address);
		let numTokensWithDecimals1 = BigInt(uUSDContributed1) * BigInt(10**18) / BigInt(price);
		expect(token.transfer(ico.address, numTokensWithDecimals1)).not.to.be.reverted;
		const unvestedNumTokensWithDecimals1 = numTokensWithDecimals1 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.claimAddress(addr1.address))
			.to.changeTokenBalances(token, [ico, addr1], [BigInt(-1) * unvestedNumTokensWithDecimals1, unvestedNumTokensWithDecimals1]);	// same address ico and token
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(0);
		expect(await ico.getContribution(addr1.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr1.address, 'COIN')).to.equal(0);

		// claim tokens from investors 2
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(19000 * 10**6);
		let uUSDContributed2 = await ico.getuUSDToClaim(addr2.address);
		let numTokensWithDecimals2 = BigInt(uUSDContributed2) * BigInt(10**18) / BigInt(price);
		expect(token.transfer(ico.address, numTokensWithDecimals2)).not.to.be.reverted;
		const unvestedNumTokensWithDecimals2 = numTokensWithDecimals2 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.claimAddress(addr2.address))
			.to.changeTokenBalances(token, [ico, addr2], [BigInt(-1) * unvestedNumTokensWithDecimals2, unvestedNumTokensWithDecimals2]);	// same address ico and token
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(0);
		expect(await ico.getContribution(addr2.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr2.address, 'COIN')).to.equal(0);

		// claim tokens from investors 3
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(19000 * 10**6);
		let uUSDContributed3 = await ico.getuUSDToClaim(addr3.address);
		let numTokensWithDecimals3 = BigInt(uUSDContributed3) * BigInt(10**18) / BigInt(price);
		expect(token.transfer(ico.address, numTokensWithDecimals3)).not.to.be.reverted;
		const unvestedNumTokensWithDecimals3 = numTokensWithDecimals3 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.claimAddress(addr3.address))
			.to.changeTokenBalances(token, [ico, addr3], [BigInt(-1) * unvestedNumTokensWithDecimals3, unvestedNumTokensWithDecimals3]);	// same address ico and token
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(0);
		expect(await ico.getContribution(addr3.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr3.address, 'COIN')).to.equal(0);

		// vest all coins
		expect(await vesting.getTotalVestableAmount()).to.equal((BigInt(3) * numTokensWithDecimals1 * BigInt(90) / BigInt(100)) - BigInt(2));
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 480 * helpers.TIME.MILLIS_IN_DAY ]);

		// vest coins from investor 1
		expect(await token.balanceOf(addr1.address)).to.equal(unvestedNumTokensWithDecimals1);
		const vestedNumTokensWithDecimals1 = numTokensWithDecimals1 * BigInt(90) / BigInt(100);																					// vested tokens
		await expect(() => vesting.connect(addr1).release(0))
			.to.changeTokenBalances(token, [vesting, addr1], [BigInt(-1) * vestedNumTokensWithDecimals1, vestedNumTokensWithDecimals1]);
		expect(await token.balanceOf(addr1.address)).to.equal(numTokensWithDecimals1 - BigInt(1));

		// vest coins from investor 2
		expect(await token.balanceOf(addr2.address)).to.equal(unvestedNumTokensWithDecimals2);
		const vestedNumTokensWithDecimals2 = numTokensWithDecimals2 * BigInt(90) / BigInt(100);																					// vested tokens
		await expect(() => vesting.connect(addr2).release(1))
			.to.changeTokenBalances(token, [vesting, addr2], [BigInt(-1) * vestedNumTokensWithDecimals2, vestedNumTokensWithDecimals2]);
		expect(await token.balanceOf(addr2.address)).to.equal(numTokensWithDecimals2 - BigInt(1));

		// vest coins from investor 3
		expect(await token.balanceOf(addr3.address)).to.equal(unvestedNumTokensWithDecimals3);
		const vestedNumTokensWithDecimals3 = numTokensWithDecimals3 * BigInt(90) / BigInt(100);																					// vested tokens
		await expect(() => vesting.connect(addr3).release(2))
			.to.changeTokenBalances(token, [vesting, addr3], [BigInt(-1) * vestedNumTokensWithDecimals3, vestedNumTokensWithDecimals3]);
		expect(await token.balanceOf(addr3.address)).to.equal(numTokensWithDecimals3 - BigInt(1));

		// withdraw
		await ico.setTargetWalletAddress(liquidity.address);

		let balanceOfICO = await ethers.provider.getBalance(ico.address);
		await expect(await ico.withdraw("COIN", 100))
			.to.changeEtherBalances([ico, liquidity], [balanceOfICO.mul(-1), balanceOfICO]);
		expect(await ethers.provider.getBalance(ico.address)).to.equal(0);
		expect(await ethers.provider.getBalance(token.address)).to.equal(0);

		expect((await ico.getPaymentToken("COIN"))[4]).to.equal(0, 'Invested amount must be zero');		// uUSDInvested
		expect((await ico.getPaymentToken("COIN"))[5]).to.equal(0, 'Invested amount must be zero');		// amountInvested

		// verify finish
		expect(await ico.owner()).to.equal(owner.address);
		expect(await ico.getCrowdsaleStage()).to.equal(helpers.STAGE.FINISHED, 'The stage couldn\'t be set to Finished');
		expect(await ico.getTotaluUSDInvested()).to.equal(57000000000);																																		// totaluUSDTInvested
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
			expect(await ico.getuUSDInvested(investors[i])).to.equal(19000000000);
			expect(await ico.getContribution(addr1.address, 'COIN')).to.equal(0);																														// cAmountInvested
			expect(await ico.getuUSDContribution(addr1.address, 'COIN')).to.equal(0);																												// cuUSDInvested
		}
		expect(await ico.getTokenAddress()).to.equal(token.address, 'token address should be ' + token.address);													// tokenAddress
		expect(await ico.getTargetWalletAddress()).to.equal(liquidity.address, 'targetWalletAddress should be ' + liquidity.address);			// targetWalletAddress

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
			expect(await ico.getuUSDInvested(investors[i])).to.equal(19000000000);
			expect(await ico.getContribution(addr1.address, 'COIN')).to.equal(0);																														// cAmountInvested
			expect(await ico.getuUSDContribution(addr1.address, 'COIN')).to.equal(0);																												// cuUSDInvested
		}
		expect(await ico.getTokenAddress()).to.equal('0x0000000000000000000000000000000000000000', 'token address should be zero');				// tokenAddress
		expect(await ico.getTargetWalletAddress()).to.equal('0x0000000000000000000000000000000000000000', 'token address should be zero');// targetWalletAddress

	});

	/********************************************************************************************************/
	/*********************************************** Withdraw ***********************************************/
	/********************************************************************************************************/
	it("Should be able to Withdraw Coins", async() => {

		await ico.setCrowdsaleStage(helpers.STAGE.ONGOING);

		await ico.setMaxuUSDTransfer(20_000_000 * 10**6);
		await ico.setMaxuUSDInvestment(140_000_000 * 10**6);
		await ico.setWhitelistuUSDThreshold(20_000_000 * 10**6);

		await ico.setTargetWalletAddress(liquidity.address);

		await expect(helpers.testTransferCoin(addr1, 19000, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr2, 19000, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr3, 19000, ico)).not.to.be.reverted;
		
		await ico.setCrowdsaleStage(helpers.STAGE.FINISHED);

		// withdraw ether to wallets
		let balanceOfICO = await ethers.provider.getBalance(ico.address);
		await expect(await ico.withdraw("COIN", 100))
			.to.changeEtherBalances([ico, liquidity], [balanceOfICO.mul(-1), balanceOfICO]);
		expect(await ethers.provider.getBalance(ico.address)).to.equal(0);
		expect(await ethers.provider.getBalance(token.address)).to.equal(0);

		expect((await ico.getPaymentToken("COIN"))[4]).to.equal(0, 'Invested amount must be zero');		// uUSDInvested
		expect((await ico.getPaymentToken("COIN"))[5]).to.equal(0, 'Invested amount must be zero');		// amountInvested			
	});

});
