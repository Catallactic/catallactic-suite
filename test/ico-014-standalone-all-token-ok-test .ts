import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import * as helpers from "./_testhelper";

describe("ico-014-standalone-all-token-ok-test", function () {
	const hre = require("hardhat");

	let owner: SignerWithAddress, project: SignerWithAddress, liquidity: SignerWithAddress;
	let addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addrs;
	let chainLinkAggregator: Contract, foo: Contract, ico: Contract, vesting: Contract, token: Contract;

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

		[owner, project, liquidity, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
		[owner, project, liquidity, addr1, addr2, addr3, ...addrs].forEach(async(account, i) => {
			let balance = await ethers.provider.getBalance(account.address);
			console.log('%d - address: %s ; balance: %s', ++i, account.address, balance);
		});

		// deploy oracle mock smart contract
		const ChainLinkAggregator = await ethers.getContractFactory("DemoMockAggregator", owner);
		chainLinkAggregator = await ChainLinkAggregator.deploy();
		await chainLinkAggregator.deployed();
		console.log("ChainLinkAggregator:" + chainLinkAggregator.address);

		// deploy ico smart contract
		const CrowdsaleFacet = await ethers.getContractFactory("CrowdsaleFacet");
		ico = await CrowdsaleFacet.deploy();
		await ico.deployed();
		console.log("deployed ICO:" + ico.address);

		// deploy vesting smart contract
		const VestingFacet = await ethers.getContractFactory("VestingFacet");
		vesting = await VestingFacet.deploy();
		await vesting.deployed();
		console.log("deployed Vesting:" + vesting.address);

		// deploy token smart contract
		const ERC20Facet = await ethers.getContractFactory("ERC20Facet");
		token = await ERC20Facet.deploy();
		await token.deployed();
		console.log("deployed Token:" + token.address);

		// deploy payment token
		const FOO = await ethers.getContractFactory("FOO");
		foo = await FOO.deploy("FOO", "FOO");
		await foo.deployed();
		console.log("deployed FOO:" + foo.address);

		// initialize
		console.log('initializing')
		await expect(ico.setStorage()).not.to.be.reverted;
		await expect(vesting.setStorage()).not.to.be.reverted;
		await expect(token.setStorage()).not.to.be.reverted;
		await expect(await ico.owner()).to.equal('0x0000000000000000000000000000000000000000');
		await expect(token.initialize("CatallacticERC20", "CATA", BigInt(200_000_000 * 10**18))).not.to.be.reverted;
		await expect(vesting.createVesting('abc', Date.now(), helpers.TIME.MILLIS_IN_MONTH, helpers.TIME.MILLIS_IN_YEAR, 12)).not.to.be.reverted;
		await expect(ico.createCrowdsale(30_000, 300_000_000_000, 50_000_000_000, 1_000_000_000, 100_000_000_000, 100_000_000_000, 9_999_999, 90, 'abc')).not.to.be.reverted;
		await expect(ico.setPaymentToken("FOO", ico.address, chainLinkAggregator.address, Math.floor(1100*1e6), 18)).not.to.be.reverted;
		await expect(await ico.owner()).to.equal(owner.address);
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
	/************************************************ Claim *************************************************/
	/********************************************************************************************************/
	it("Should be able to claim Tokens", async() => {
		// prepare test
		await ico.setCrowdsaleStage(helpers.STAGE.ONGOING);

		await ico.setMaxuUSDTransfer(20_000_000 * 10**6);
		await ico.setMaxuUSDInvestment(140_000_000 * 10**6);
		await ico.setWhitelistuUSDThreshold(20_000_000 * 10**6);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await expect(helpers.testTransferToken(addr1, 'FOO', 19000, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr2, 'FOO', 19000, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr3, 'FOO', 19000, ico, foo)).not.to.be.reverted;

		await ico.setTokenAddress(token.address);
		await ico.setVestingAddress(vesting.address);
		await vesting.addGrantor(ico.address);
		await vesting.setTokenAddress(token.address);

		await ico.setCrowdsaleStage(helpers.STAGE.FINISHED);

		// claim all coins
		let price: number = await ico.getPriceuUSD();
		console.log("price " + price);

		// claim tokens from investors 1
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(19000 * 10**6 - 1);
		let uUSDContributed1 = await ico.getuUSDToClaim(addr1.address);
		let numTokensWithDecimals1 = BigInt(uUSDContributed1) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals1);
		const unvestedNumTokensWithDecimals1 = numTokensWithDecimals1 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.connect(addr1).claim())
			.to.changeTokenBalances(token, [ico, addr1], [BigInt(-1) * numTokensWithDecimals1, unvestedNumTokensWithDecimals1]);
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(0);
		expect(await ico.getContribution(addr1.address, 'FOO')).to.equal(0);
		expect(await ico.getuUSDContribution(addr1.address, 'FOO')).to.equal(0);

		// claim tokens from investors 2
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(19000 * 10**6 - 1);
		let uUSDContributed2 = await ico.getuUSDToClaim(addr2.address);
		let numTokensWithDecimals2 = BigInt(uUSDContributed2) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals2);
		const unvestedNumTokensWithDecimals2 = numTokensWithDecimals2 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.connect(addr2).claim())
			.to.changeTokenBalances(token, [ico, addr2], [BigInt(-1) * numTokensWithDecimals2, unvestedNumTokensWithDecimals2]);
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(0);
		expect(await ico.getContribution(addr2.address, 'FOO')).to.equal(0);
		expect(await ico.getuUSDContribution(addr2.address, 'FOO')).to.equal(0);

		// claim tokens from investors 3
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(19000 * 10**6 - 1);
		let uUSDContributed3 = await ico.getuUSDToClaim(addr3.address);
		let numTokensWithDecimals3 = BigInt(uUSDContributed3) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals3);
		const unvestedNumTokensWithDecimals3 = numTokensWithDecimals2 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.connect(addr3).claim())
			.to.changeTokenBalances(token, [ico, addr3], [BigInt(-1) * numTokensWithDecimals3, unvestedNumTokensWithDecimals3]);
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(0);
		expect(await ico.getContribution(addr3.address, 'FOO')).to.equal(0);
		expect(await ico.getuUSDContribution(addr3.address, 'FOO')).to.equal(0);

		// vest all coins
		expect(await vesting.getTotalVestableAmount()).to.equal((BigInt(3) * numTokensWithDecimals1 * BigInt(90) / BigInt(100)));
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 480 * helpers.TIME.MILLIS_IN_DAY ]);

		// vest coins from investor 1
		console.log("claim4" );
		expect(await token.balanceOf(addr1.address)).to.equal(unvestedNumTokensWithDecimals1);
		const vestedNumTokensWithDecimals1 = numTokensWithDecimals1 * BigInt(90) / BigInt(100);																					// vested tokens
		await expect(() => vesting.connect(addr1).release(0))
			.to.changeTokenBalances(token, [vesting, addr1], [BigInt(-1) * vestedNumTokensWithDecimals1, vestedNumTokensWithDecimals1]);
		expect(await token.balanceOf(addr1.address)).to.equal(numTokensWithDecimals1);

		// vest coins from investor 2
		console.log("claim6" );
		expect(await token.balanceOf(addr2.address)).to.equal(unvestedNumTokensWithDecimals2);
		const vestedNumTokensWithDecimals2 = numTokensWithDecimals2 * BigInt(90) / BigInt(100);																					// vested tokens
		await expect(() => vesting.connect(addr2).release(1))
			.to.changeTokenBalances(token, [vesting, addr2], [BigInt(-1) * vestedNumTokensWithDecimals2, vestedNumTokensWithDecimals2]);
		expect(await token.balanceOf(addr2.address)).to.equal(numTokensWithDecimals2);

		// vest coins from investor 3
		console.log("claim7" );
		expect(await token.balanceOf(addr3.address)).to.equal(unvestedNumTokensWithDecimals3);
		const vestedNumTokensWithDecimals3 = numTokensWithDecimals3 * BigInt(90) / BigInt(100);																					// vested tokens
		await expect(() => vesting.connect(addr3).release(2))
			.to.changeTokenBalances(token, [vesting, addr3], [BigInt(-1) * vestedNumTokensWithDecimals3, vestedNumTokensWithDecimals3]);
		expect(await token.balanceOf(addr3.address)).to.equal(numTokensWithDecimals3);

	});

	it("Should be able to claim Tokens by admin", async() => {
		// prepare test
		await ico.setCrowdsaleStage(helpers.STAGE.ONGOING);

		await ico.setMaxuUSDTransfer(20_000_000 * 10**6);
		await ico.setMaxuUSDInvestment(140_000_000 * 10**6);
		await ico.setWhitelistuUSDThreshold(20_000_000 * 10**6);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await expect(helpers.testTransferToken(addr1, 'FOO', 19000, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr2, 'FOO', 19000, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr3, 'FOO', 19000, ico, foo)).not.to.be.reverted;

		await ico.setTokenAddress(token.address);
		await ico.setVestingAddress(vesting.address);
		await vesting.addGrantor(ico.address);
		await vesting.setTokenAddress(token.address);

		await ico.setCrowdsaleStage(helpers.STAGE.FINISHED);

		// claim all coins
		let price: number = await ico.getPriceuUSD();
		console.log("price " + price);

		// claim tokens from investors 1
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(19000 * 10**6 - 1);
		let uUSDContributed1 = await ico.getuUSDToClaim(addr1.address);
		let numTokensWithDecimals1 = BigInt(uUSDContributed1) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals1);
		const unvestedNumTokensWithDecimals1 = numTokensWithDecimals1 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.claimAddress(addr1.address))
			.to.changeTokenBalances(token, [ico, addr1], [BigInt(-1) * numTokensWithDecimals1, unvestedNumTokensWithDecimals1]);
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(0);
		expect(await ico.getContribution(addr1.address, 'FOO')).to.equal(0);
		expect(await ico.getuUSDContribution(addr1.address, 'FOO')).to.equal(0);

		// claim tokens from investors 2
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(19000 * 10**6 - 1);
		let uUSDContributed2 = await ico.getuUSDToClaim(addr2.address);
		let numTokensWithDecimals2 = BigInt(uUSDContributed2) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals2);
		const unvestedNumTokensWithDecimals2 = numTokensWithDecimals2 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.claimAddress(addr2.address))
			.to.changeTokenBalances(token, [ico, addr2], [BigInt(-1) * numTokensWithDecimals2, unvestedNumTokensWithDecimals2]);
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(0);
		expect(await ico.getContribution(addr2.address, 'FOO')).to.equal(0);
		expect(await ico.getuUSDContribution(addr2.address, 'FOO')).to.equal(0);

		// claim tokens from investors 3
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(19000 * 10**6 - 1);
		let uUSDContributed3 = await ico.getuUSDToClaim(addr3.address);
		let numTokensWithDecimals3 = BigInt(uUSDContributed3) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals3);
		const unvestedNumTokensWithDecimals3 = numTokensWithDecimals3 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.claimAddress(addr3.address))
			.to.changeTokenBalances(token, [ico, addr3], [BigInt(-1) * numTokensWithDecimals3, unvestedNumTokensWithDecimals3]);
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(0);
		expect(await ico.getContribution(addr3.address, 'FOO')).to.equal(0);
		expect(await ico.getuUSDContribution(addr3.address, 'FOO')).to.equal(0);

		// vest all coins
		expect(await vesting.getTotalVestableAmount()).to.equal((BigInt(3) * numTokensWithDecimals1 * BigInt(90) / BigInt(100)));
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 480 * helpers.TIME.MILLIS_IN_DAY ]);

		// vest coins from investor 1
		expect(await token.balanceOf(addr1.address)).to.equal(unvestedNumTokensWithDecimals1);
		const vestedNumTokensWithDecimals1 = numTokensWithDecimals1 * BigInt(90) / BigInt(100);																					// vested tokens
		await expect(() => vesting.connect(addr1).release(0))
			.to.changeTokenBalances(token, [vesting, addr1], [BigInt(-1) * vestedNumTokensWithDecimals1, vestedNumTokensWithDecimals1]);
		expect(await token.balanceOf(addr1.address)).to.equal(numTokensWithDecimals1);

		// vest coins from investor 2
		expect(await token.balanceOf(addr2.address)).to.equal(unvestedNumTokensWithDecimals2);
		const vestedNumTokensWithDecimals2 = numTokensWithDecimals2 * BigInt(90) / BigInt(100);																					// vested tokens
		await expect(() => vesting.connect(addr2).release(1))
			.to.changeTokenBalances(token, [vesting, addr2], [BigInt(-1) * vestedNumTokensWithDecimals2, vestedNumTokensWithDecimals2]);
		expect(await token.balanceOf(addr2.address)).to.equal(numTokensWithDecimals2);

		// vest coins from investor 3
		expect(await token.balanceOf(addr3.address)).to.equal(unvestedNumTokensWithDecimals3);
		const vestedNumTokensWithDecimals3 = numTokensWithDecimals3 * BigInt(90) / BigInt(100);																					// vested tokens
		await expect(() => vesting.connect(addr3).release(2))
			.to.changeTokenBalances(token, [vesting, addr3], [BigInt(-1) * vestedNumTokensWithDecimals3, vestedNumTokensWithDecimals3]);
		expect(await token.balanceOf(addr3.address)).to.equal(numTokensWithDecimals3);

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

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await expect(helpers.testTransferToken(addr1, 'FOO', 19000, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr2, 'FOO', 19000, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr3, 'FOO', 19000, ico, foo)).not.to.be.reverted;

		await ico.setTokenAddress(token.address);
		await ico.setVestingAddress(vesting.address);
		await vesting.addGrantor(ico.address);
		await vesting.setTokenAddress(token.address);

		await ico.setCrowdsaleStage(helpers.STAGE.FINISHED);

		// claim all coins
		let price: number = await ico.getPriceuUSD();
		console.log("price " + price);

		// claim tokens from investors 1
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(19000 * 10**6 - 1);
		let uUSDContributed1 = await ico.getuUSDToClaim(addr1.address);
		let numTokensWithDecimals1 = BigInt(uUSDContributed1) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals1);
		const unvestedNumTokensWithDecimals1 = numTokensWithDecimals1 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.claimAddress(addr1.address))
			.to.changeTokenBalances(token, [ico, addr1], [BigInt(-1) * numTokensWithDecimals1, unvestedNumTokensWithDecimals1]);
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(0);
		expect(await ico.getContribution(addr1.address, 'FOO')).to.equal(0);
		expect(await ico.getuUSDContribution(addr1.address, 'FOO')).to.equal(0);

		// claim tokens from investors 2
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(19000 * 10**6 - 1);
		let uUSDContributed2 = await ico.getuUSDToClaim(addr2.address);
		let numTokensWithDecimals2 = BigInt(uUSDContributed2) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals2);
		const unvestedNumTokensWithDecimals2 = numTokensWithDecimals2 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.claimAddress(addr2.address))
			.to.changeTokenBalances(token, [ico, addr2], [BigInt(-1) * numTokensWithDecimals2, unvestedNumTokensWithDecimals2]);
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(0);
		expect(await ico.getContribution(addr2.address, 'FOO')).to.equal(0);
		expect(await ico.getuUSDContribution(addr2.address, 'FOO')).to.equal(0);

		// claim tokens from investors 3
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(19000 * 10**6 - 1);
		let uUSDContributed3 = await ico.getuUSDToClaim(addr3.address);
		let numTokensWithDecimals3 = BigInt(uUSDContributed3) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals3);
		const unvestedNumTokensWithDecimals3 = numTokensWithDecimals3 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.claimAddress(addr3.address))
			.to.changeTokenBalances(token, [ico, addr3], [BigInt(-1) * numTokensWithDecimals3, unvestedNumTokensWithDecimals3]);
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(0);
		expect(await ico.getContribution(addr3.address, 'FOO')).to.equal(0);
		expect(await ico.getuUSDContribution(addr3.address, 'FOO')).to.equal(0);

		// vest all coins
		expect(await vesting.getTotalVestableAmount()).to.equal((BigInt(3) * numTokensWithDecimals1 * BigInt(90) / BigInt(100)));
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 480 * helpers.TIME.MILLIS_IN_DAY ]);

		// vest coins from investor 1
		expect(await token.balanceOf(addr1.address)).to.equal(unvestedNumTokensWithDecimals1);
		const vestedNumTokensWithDecimals1 = numTokensWithDecimals1 * BigInt(90) / BigInt(100);																					// vested tokens
		await expect(() => vesting.connect(addr1).release(0))
			.to.changeTokenBalances(token, [vesting, addr1], [BigInt(-1) * vestedNumTokensWithDecimals1, vestedNumTokensWithDecimals1]);
		expect(await token.balanceOf(addr1.address)).to.equal(numTokensWithDecimals1);

		// vest coins from investor 2
		expect(await token.balanceOf(addr2.address)).to.equal(unvestedNumTokensWithDecimals2);
		const vestedNumTokensWithDecimals2 = numTokensWithDecimals2 * BigInt(90) / BigInt(100);																					// vested tokens
		await expect(() => vesting.connect(addr2).release(1))
			.to.changeTokenBalances(token, [vesting, addr2], [BigInt(-1) * vestedNumTokensWithDecimals2, vestedNumTokensWithDecimals2]);
		expect(await token.balanceOf(addr2.address)).to.equal(numTokensWithDecimals2);

		// vest coins from investor 3
		expect(await token.balanceOf(addr3.address)).to.equal(unvestedNumTokensWithDecimals3);
		const vestedNumTokensWithDecimals3 = numTokensWithDecimals3 * BigInt(90) / BigInt(100);																					// vested tokens
		await expect(() => vesting.connect(addr3).release(2))
			.to.changeTokenBalances(token, [vesting, addr3], [BigInt(-1) * vestedNumTokensWithDecimals3, vestedNumTokensWithDecimals3]);
		expect(await token.balanceOf(addr3.address)).to.equal(numTokensWithDecimals3);

		await ico.setTargetWalletAddress(liquidity.address);

		// withdraw ether to wallets
		let balanceOfICO = await foo.balanceOf(ico.address);
		console.log("balanceOfICO " + balanceOfICO);
		await expect(() => ico.withdraw("FOO", 100))
			.to.changeTokenBalances(foo, [ico, liquidity], [balanceOfICO.mul(-1), balanceOfICO]);
		expect(await foo.balanceOf(ico.address)).to.equal(0);
		expect(await foo.balanceOf(token.address)).to.equal(0);

		expect((await ico.getPaymentToken("FOO"))[4]).to.equal(0, 'Invested amount must be zero');		// uUSDInvested
		expect((await ico.getPaymentToken("FOO"))[5]).to.equal(0, 'Invested amount must be zero');		// amountInvested		

		// verify finish
		expect(await ico.owner()).to.equal(owner.address);
		expect(await ico.getCrowdsaleStage()).to.equal(helpers.STAGE.FINISHED, 'The stage couldn\'t be set to Finished');
		expect(await ico.getTotaluUSDInvested()).to.equal(56999999997);																																		// totaluUSDTInvested
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
			expect(await ico.getuUSDInvested(investors[i])).to.equal(18999999999);
			expect(await ico.getContribution(addr1.address, 'FOO')).to.equal(0);																														// cAmountInvested
			expect(await ico.getuUSDContribution(addr1.address, 'FOO')).to.equal(0);																												// cuUSDInvested
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
			expect(await ico.getuUSDInvested(investors[i])).to.equal(18999999999);
			expect(await ico.getContribution(addr1.address, 'FOO')).to.equal(0);																														// cAmountInvested
			expect(await ico.getuUSDContribution(addr1.address, 'FOO')).to.equal(0);																												// cuUSDInvested
		}
		expect(await ico.getTokenAddress()).to.equal('0x0000000000000000000000000000000000000000', 'token address should be zero');				// tokenAddress
		expect(await ico.getTargetWalletAddress()).to.equal('0x0000000000000000000000000000000000000000', 'token address should be zero');// targetWalletAddress

	});

	/********************************************************************************************************/
	/*********************************************** Withdraw ***********************************************/
	/********************************************************************************************************/
	it("Should be able to Withdraw Tokens", async() => {
		await ico.setCrowdsaleStage(helpers.STAGE.ONGOING);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await ico.setMaxuUSDTransfer(20_000_000 * 10**6);
		await ico.setMaxuUSDInvestment(140_000_000 * 10**6);
		await ico.setWhitelistuUSDThreshold(20_000_000 * 10**6);

		await ico.setTargetWalletAddress(liquidity.address);

		await expect(helpers.testTransferToken(addr1, 'FOO', 19000, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr2, 'FOO', 19000, ico, foo)).not.to.be.reverted;
		await expect(helpers.testTransferToken(addr3, 'FOO', 19000, ico, foo)).not.to.be.reverted;

		await ico.setCrowdsaleStage(helpers.STAGE.FINISHED);

		// withdraw ether to wallets
		let balanceOfICO = await foo.balanceOf(ico.address);
		console.log("balanceOfICO " + balanceOfICO);
		await expect(() => ico.withdraw("FOO", 100))
			.to.changeTokenBalances(foo, [ico, liquidity], [balanceOfICO.mul(-1), balanceOfICO]);
		expect(await foo.balanceOf(ico.address)).to.equal(0);
		expect(await foo.balanceOf(token.address)).to.equal(0);

		expect((await ico.getPaymentToken("FOO"))[4]).to.equal(0, 'Invested amount must be zero');		// uUSDInvested
		expect((await ico.getPaymentToken("FOO"))[5]).to.equal(0, 'Invested amount must be zero');		// amountInvested			

	});

});
