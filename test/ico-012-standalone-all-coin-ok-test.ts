import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import * as helpers from "./_testhelper";

describe("ico-012-standalone-all-coin-ok-test", function () {
	const hre = require("hardhat");

	let owner: SignerWithAddress, project: SignerWithAddress, liquidity: SignerWithAddress;
	let addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addrs;

	let ChainLinkAggregator, chainLinkAggregator: Contract;
	let CrowdsaleFacet, ico: Contract;
	let VestingFacet, vesting: Contract;
	let ERC20Facet, token: Contract;


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

		ChainLinkAggregator = await ethers.getContractFactory("DemoMockAggregator", owner);
		chainLinkAggregator = await ChainLinkAggregator.deploy();
		await chainLinkAggregator.deployed();
		console.log("ChainLinkAggregator:" + chainLinkAggregator.address);

		CrowdsaleFacet = await ethers.getContractFactory("CrowdsaleFacet");
		ico = await CrowdsaleFacet.deploy();
		await ico.deployed();
		await expect(ico.createCrowdsale(30_000, 300_000_000_000, 50_000_000_000, 1_000_000_000, 100_000_000_000, 100_000_000_000, 9_999_999, 90, 0)).not.to.be.reverted;
		await expect(ico.setPaymentToken("COIN", ico.address, chainLinkAggregator.address, Math.floor(1100*1e6), 18)).not.to.be.reverted;
		console.log("deployed ICO:" + ico.address);

		VestingFacet = await ethers.getContractFactory("VestingFacet");
		vesting = await VestingFacet.deploy();
		await vesting.deployed();
		await expect(vesting.createVesting(Date.now(), helpers.TIME.MILLIS_IN_MONTH, helpers.TIME.MILLIS_IN_YEAR, 12)).not.to.be.reverted;
		console.log("deployed Vesting:" + vesting.address);

		ERC20Facet = await ethers.getContractFactory("ERC20Facet");
		token = await ERC20Facet.deploy();
		await token.deployed();
		await expect(token.initialize()).not.to.be.reverted;
		console.log("deployed Token:" + token.address);

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
		await ico.setCrowdsaleStage(1);

		await ico.setMaxuUSDTransfer(20_000_000 * 10**6);
		await ico.setMaxuUSDInvestment(140_000_000 * 10**6);
		await ico.setWhitelistuUSDThreshold(20_000_000 * 10**6);

		await ico.setTokenAddress(token.address);
		await ico.setVestingAddress(vesting.address);
		await vesting.addGrantor(ico.address, true);
		await vesting.setTokenAddress(token.address);

		await expect(helpers.testTransferCoin(addr1, 19000, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr2, 19000, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr3, 19000, ico)).not.to.be.reverted;

		await ico.setCrowdsaleStage(3);

		// claim all coins
		let price: number = await ico.getPriceuUSD();
		console.log("price " + price);

		// claim coins from investor 1
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(19000 * 10**6);
		let uUSDContributed1 = await ico.getuUSDToClaim(addr1.address);
		let numTokensWithDecimals1 = BigInt(uUSDContributed1) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals1);
		const unvestedNumTokensWithDecimals1 = numTokensWithDecimals1 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.connect(addr1).claim())
			.to.changeTokenBalances(token, [ico, addr1], [BigInt(-1) * numTokensWithDecimals1 + BigInt(1), unvestedNumTokensWithDecimals1]);
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(0);
		expect(await ico.getContribution(addr1.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr1.address, 'COIN')).to.equal(0);

		// claim coins from investor 2
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(19000 * 10**6);
		let uUSDContributed2 = await ico.getuUSDToClaim(addr2.address);
		let numTokensWithDecimals2 = BigInt(uUSDContributed2) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals2);
		const unvestedNumTokensWithDecimals2 = numTokensWithDecimals2 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.connect(addr2).claim())
			.to.changeTokenBalances(token, [ico, addr2], [BigInt(-1) * numTokensWithDecimals2 + BigInt(1), unvestedNumTokensWithDecimals2]);
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(0);
		expect(await ico.getContribution(addr2.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr2.address, 'COIN')).to.equal(0);

		// claim coins from investor 3
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(19000 * 10**6);
		let uUSDContributed3 = await ico.getuUSDToClaim(addr3.address);
		let numTokensWithDecimals3 = BigInt(uUSDContributed3) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals3);
		const unvestedNumTokensWithDecimals3 = numTokensWithDecimals3 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.connect(addr3).claim())
			.to.changeTokenBalances(token, [ico, addr3], [BigInt(-1) * numTokensWithDecimals3 + BigInt(1), unvestedNumTokensWithDecimals3]);
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

	it("Should be able to Claim Coins by admin", async() => {

		// prepare test
		await ico.setCrowdsaleStage(1);

		await ico.setMaxuUSDTransfer(20_000_000 * 10**6);
		await ico.setMaxuUSDInvestment(140_000_000 * 10**6);
		await ico.setWhitelistuUSDThreshold(20_000_000 * 10**6);

		await ico.setTokenAddress(token.address);
		await ico.setVestingAddress(vesting.address);
		await vesting.addGrantor(ico.address, true);
		await vesting.setTokenAddress(token.address);

		await expect(helpers.testTransferCoin(addr1, 19000, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr2, 19000, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr3, 19000, ico)).not.to.be.reverted;

		await ico.setCrowdsaleStage(3);

		// claim all coins
		let price: number = await ico.getPriceuUSD();
		console.log("price " + price);

		// claim coins from investor 1
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(19000 * 10**6);
		let uUSDContributed1 = await ico.getuUSDToClaim(addr1.address);
		let numTokensWithDecimals1 = BigInt(uUSDContributed1) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals1);
		const unvestedNumTokensWithDecimals1 = numTokensWithDecimals1 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.claimAddress(addr1.address))
			.to.changeTokenBalances(token, [ico, addr1], [BigInt(-1) * numTokensWithDecimals1 + BigInt(1), unvestedNumTokensWithDecimals1]);
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(0);
		expect(await ico.getContribution(addr1.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr1.address, 'COIN')).to.equal(0);

		// claim coins from investor 2
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(19000 * 10**6);
		let uUSDContributed2 = await ico.getuUSDToClaim(addr2.address);
		let numTokensWithDecimals2 = BigInt(uUSDContributed2) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals2);
		const unvestedNumTokensWithDecimals2 = numTokensWithDecimals2 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.claimAddress(addr2.address))
			.to.changeTokenBalances(token, [ico, addr2], [BigInt(-1) * numTokensWithDecimals2 + BigInt(1), unvestedNumTokensWithDecimals2]);
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(0);
		expect(await ico.getContribution(addr2.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr2.address, 'COIN')).to.equal(0);

		// claim coins from investor 3
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(19000 * 10**6);
		let uUSDContributed3 = await ico.getuUSDToClaim(addr3.address);
		let numTokensWithDecimals3 = BigInt(uUSDContributed3) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals3);
		const unvestedNumTokensWithDecimals3 = numTokensWithDecimals3 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.claimAddress(addr3.address))
			.to.changeTokenBalances(token, [ico, addr3], [BigInt(-1) * numTokensWithDecimals3 + BigInt(1), unvestedNumTokensWithDecimals3]);
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
		await ico.setCrowdsaleStage(1);

		await ico.setMaxuUSDTransfer(20_000_000 * 10**6);
		await ico.setMaxuUSDInvestment(140_000_000 * 10**6);
		await ico.setWhitelistuUSDThreshold(20_000_000 * 10**6);

		await ico.setTokenAddress(token.address);
		await ico.setVestingAddress(vesting.address);
		await vesting.addGrantor(ico.address, true);
		await vesting.setTokenAddress(token.address);

		await expect(helpers.testTransferCoin(addr1, 19000, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr2, 19000, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr3, 19000, ico)).not.to.be.reverted;

		await ico.setCrowdsaleStage(3);

		// claim all coins
		let price: number = await ico.getPriceuUSD();
		console.log("price " + price);

		// claim coins from investor 1
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(19000 * 10**6);
		let uUSDContributed1 = await ico.getuUSDToClaim(addr1.address);
		let numTokensWithDecimals1 = BigInt(uUSDContributed1) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals1);
		const unvestedNumTokensWithDecimals1 = numTokensWithDecimals1 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.claimAddress(addr1.address))
			.to.changeTokenBalances(token, [ico, addr1], [BigInt(-1) * numTokensWithDecimals1 + BigInt(1), unvestedNumTokensWithDecimals1]);
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(0);
		expect(await ico.getContribution(addr1.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr1.address, 'COIN')).to.equal(0);

		// claim coins from investor 2
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(19000 * 10**6);
		let uUSDContributed2 = await ico.getuUSDToClaim(addr2.address);
		let numTokensWithDecimals2 = BigInt(uUSDContributed2) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals2);
		const unvestedNumTokensWithDecimals2 = numTokensWithDecimals2 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.claimAddress(addr2.address))
			.to.changeTokenBalances(token, [ico, addr2], [BigInt(-1) * numTokensWithDecimals2 + BigInt(1), unvestedNumTokensWithDecimals2]);
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(0);
		expect(await ico.getContribution(addr2.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr2.address, 'COIN')).to.equal(0);

		// claim coins from investor 3
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(19000 * 10**6);
		let uUSDContributed3 = await ico.getuUSDToClaim(addr3.address);
		let numTokensWithDecimals3 = BigInt(uUSDContributed3) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals3);
		const unvestedNumTokensWithDecimals3 = numTokensWithDecimals3 * BigInt(10) / BigInt(100);																				// unvested tokens
		await expect(() => ico.claimAddress(addr3.address))
			.to.changeTokenBalances(token, [ico, addr3], [BigInt(-1) * numTokensWithDecimals3 + BigInt(1), unvestedNumTokensWithDecimals3]);
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
		expect(await ico.getCrowdsaleStage()).to.equal(3, 'The stage couldn\'t be set to Finished');
		expect(await ico.getTotaluUSDInvested()).to.equal(57000000000);																																		// totaluUSDTInvested
		expect(await ico.getHardCap()).to.equal(300000);
		expect(await ico.getSoftCap()).to.equal(50000);
		expect(await ico.getPriceuUSD()).to.equal(30_000);
		expect(await ico.getPercentVested()).to.equal(90);
		expect(await ico.getVestingId()).to.equal(0);
		expect(await ico.getVestingAddress()).to.equal(vesting.address);
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
		expect(await ico.getCrowdsaleStage()).to.equal(0, 'The stage couldn\'t be set to Finished');
		expect(await ico.getTotaluUSDInvested()).to.equal(0);																																							// totaluUSDTInvested
		expect(await ico.getHardCap()).to.equal(0);
		expect(await ico.getSoftCap()).to.equal(0);
		expect(await ico.getPriceuUSD()).to.equal(0);
		expect(await ico.getPercentVested()).to.equal(0);
		expect(await ico.getVestingId()).to.equal(0);
		expect(await ico.getVestingAddress()).to.equal('0x0000000000000000000000000000000000000000');
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

		await ico.setCrowdsaleStage(1);

		await ico.setMaxuUSDTransfer(20_000_000 * 10**6);
		await ico.setMaxuUSDInvestment(140_000_000 * 10**6);
		await ico.setWhitelistuUSDThreshold(20_000_000 * 10**6);

		await ico.setTargetWalletAddress(liquidity.address);

		await expect(helpers.testTransferCoin(addr1, 19000, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr2, 19000, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr3, 19000, ico)).not.to.be.reverted;
		
		await ico.setCrowdsaleStage(3);

		// withdraw ether to wallets
		let balanceOfICO = await ethers.provider.getBalance(ico.address);
		await expect(await ico.withdraw("COIN", 100))
			.to.changeEtherBalances([ico, liquidity], [balanceOfICO.mul(-1), balanceOfICO]);
		expect(await ethers.provider.getBalance(ico.address)).to.equal(0);

		expect((await ico.getPaymentToken("COIN"))[4]).to.equal(0, 'Invested amount must be zero');		// uUSDInvested
		expect((await ico.getPaymentToken("COIN"))[5]).to.equal(0, 'Invested amount must be zero');		// amountInvested			
	});

});
