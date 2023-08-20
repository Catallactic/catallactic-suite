import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import * as helpers from "./_testhelper";

describe("ico-02-standalone-coin-ico-test", function () {
	const hre = require("hardhat");

	let CrowdsaleFacet, ico: Contract;
	let ChainLinkAggregator, chainLinkAggregator: Contract;
	let owner: SignerWithAddress, project: SignerWithAddress, liquidity: SignerWithAddress;
	let addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addrs;

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

		ChainLinkAggregator = await ethers.getContractFactory("DemoMockAggregator", owner);
		chainLinkAggregator = await ChainLinkAggregator.deploy();
		await chainLinkAggregator.deployed();
		console.log("ChainLinkAggregator:" + chainLinkAggregator.address);

		CrowdsaleFacet = await ethers.getContractFactory("CrowdsaleFacet");
		ico = await CrowdsaleFacet.deploy();
		await ico.deployed();
		await expect(ico.createCrowdsale(30_000, 300_000_000_000, 50_000_000_000, 1_000_000_000, 100_000_000_000, 100_000_000_000, 9_999_999, 0, '')).not.to.be.reverted;
		await expect(ico.setPaymentToken("COIN", ico.address, chainLinkAggregator.address, Math.floor(1100*1e6), 18)).not.to.be.reverted;
		console.log("deployed ICO:" + ico.address);

		[owner, project, liquidity, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
		[owner, project, liquidity, addr1, addr2, addr3, ...addrs].forEach(async(account, i) => {
			let balance = await ethers.provider.getBalance(account.address);
			console.log('%d - address: %s ; balance: %s', ++i, account.address, balance);
		});

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
		console.log("\tproject address: " + project.address);
		console.log("\tliquidity address: " + liquidity.address);
		console.log("\n");

	});

	/********************************************************************************************************/
	/****************************************** Payment Tokens **********************************************/
	/********************************************************************************************************/
	it("Should update PaymentTokens", async() => {

		await ico.setCrowdsaleStage(1);

		await expect(helpers.testTransferCoin(addr1, 10, ico)).not.to.be.reverted;
		expect((await ico.getPaymentToken("COIN"))[4]).to.equal(1 * 9999999, 'Invested amount must be accounted');																	// uUSDInvested
		expect((await ico.getPaymentToken("COIN"))[5]).to.equal(BigInt(1 * 9090909090909090), 'Invested amount must be accounted');									// amountInvested			

		await expect(helpers.testTransferCoin(addr2, 10, ico)).not.to.be.reverted;
		expect((await ico.getPaymentToken("COIN"))[4]).to.equal(2 * 9999999, 'Invested amount must be accounted');																	// uUSDInvested
		expect((await ico.getPaymentToken("COIN"))[5]).to.equal(BigInt((2 * 9090909090909090).toString()), 'Invested amount must be accounted');		// amountInvested

		await expect(helpers.testTransferCoin(addr3, 10, ico)).not.to.be.reverted;
		expect((await ico.getPaymentToken("COIN"))[4]).to.equal(3 * 9999999, 'Invested amount must be accounted');																	// uUSDInvested
		expect((await ico.getPaymentToken("COIN"))[5]).to.equal(BigInt((3 * 9090909090909090).toString()), 'Invested amount must be accounted');		// amountInvested
	});

	it("Should allow dynamic prices", async() => {

		await ico.setCrowdsaleStage(1);

		// use default price
		await expect(helpers.testTransferCoin(addr1, 10, ico)).not.to.be.reverted;
		expect((await ico.getPaymentToken("COIN"))[4]).to.equal(1 * 9999999, 'Invested amount must be accounted');																	// uUSDInvested

		// use dynamic price - same price
		await ico.setDynamicPrice(true);
		await chainLinkAggregator.setDynamicPrice(Math.floor(1100));
		await expect(helpers.testTransferCoin(addr1, 10, ico)).not.to.be.reverted;
		expect((await ico.getPaymentToken("COIN"))[4]).to.equal(2 * 9999999, 'Invested amount must be accounted');																	// uUSDInvested

		// use dynamic price - double price
		await ico.setDynamicPrice(true);
		await chainLinkAggregator.setDynamicPrice(Math.floor(2200));
		await expect(helpers.testTransferCoin(addr1, 10, ico)).not.to.be.reverted;
		expect((await ico.getPaymentToken("COIN"))[4]).to.equal(4 * 9999999 + 1, 'Invested amount must be accounted');															// uUSDInvested

		// use dynamic price - double price
		await ico.setDynamicPrice(true);
		await chainLinkAggregator.setDynamicPrice(0);
		await expect(helpers.testTransferCoin(addr1, 10, ico)).not.to.be.reverted;
		expect((await ico.getPaymentToken("COIN"))[4]).to.equal(6 * 9999999 + 2, 'Invested amount must be accounted');															// uUSDInvested

	});

	/********************************************************************************************************/
	/********************************************** Investors ***********************************************/
	/********************************************************************************************************/
	it("Should count investors", async() => {

		await ico.setCrowdsaleStage(1);

		await expect(helpers.testTransferCoin(addr1, 10, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr2, 10, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr3, 10, ico)).not.to.be.reverted;

		let investorsCount = await ico.getInvestorsCount();
		expect(investorsCount).to.equal(3, 'Investors not counted correctly');
		let investors = await ico.getInvestors();
		for (let i = 0; i < investorsCount; i++) {
			let uusdContributedBy = await ico.getuUSDToClaim(investors[i]);
			console.log('usdContributedBy ' + uusdContributedBy);
			expect(uusdContributedBy).to.equal(9999999, 'Investor USD contributed is wrong');
			//expect(uusdContributedBy).to.be.closeTo(BigNumber.from(10000000),'Investor USD contributed is wrong');
		}

		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(9999999, 'Investor USD contributed is wrong');
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(9999999, 'Investor USD contributed is wrong');
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(9999999, 'Investor USD contributed is wrong');
	});

	/********************************************************************************************************/
	/************************************************ Deposit ***********************************************/
	/********************************************************************************************************/
	// normal
	it("Should be able to deposit", async() => {
		await ico.setCrowdsaleStage(1);

		// update balances
		await expect(await helpers.testTransferCoin(addr1, 10, ico))
			.to.changeEtherBalances([ico, addr1], [helpers.usdToWei(10),helpers.usdToWei(-10)]);

		// update counters
		expect(await ico.getContribution(addr1.address, 'COIN')).to.equal(BigInt(9090909090909090));																						// cAmountInvested
		expect(await ico.getuUSDContribution(addr1.address, 'COIN')).to.equal(9999999);																													// cuUSDInvested
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(9999999, 'Investor USD contributed is wrong');																	// uUSDToPay
		expect((await ico.getPaymentToken("COIN"))[4]).to.equal(9999999, 'Invested amount must be accounted');																	// uUSDInvested
		expect((await ico.getPaymentToken("COIN"))[5]).to.equal(BigInt((9090909090909090).toString()), 'Investor USD contributed is wrong');		// amountInvested
		expect(await ico.getTotaluUSDInvested()).to.equal(9999999);																																							// totaluUSDTInvested
		
	});

	it("Should be able to deposit only if Ongoing", async() => {
		await ico.setCrowdsaleStage(1);
		await expect(await helpers.testTransferCoin(addr1, 10, ico))
			.to.changeEtherBalances([ico, addr1], [helpers.usdToWei(10), helpers.usdToWei(-10)]);

		await ico.setCrowdsaleStage(0);
		await expect(helpers.testTransferCoin(addr1, 10, ico)).to.be.revertedWith(helpers.ERRORS.ERRD_MUST_ONG);

		await ico.setCrowdsaleStage(2);
		await expect(helpers.testTransferCoin(addr1, 10, ico)).to.be.revertedWith(helpers.ERRORS.ERRD_MUST_ONG);

		await ico.setCrowdsaleStage(3);
		await expect(helpers.testTransferCoin(addr1, 10, ico)).to.be.revertedWith(helpers.ERRORS.ERRD_MUST_ONG);
	});

	it("Should be able to whitelist and unwhitelist", async() => {
		await ico.setCrowdsaleStage(1);

		// whitelisting enabled
		await ico.setWhitelistuUSDThreshold(30 * 10**6);
		await ico.unwhitelistUser(addr1.address);
		await expect(helpers.testTransferCoin(addr1, 31, ico)).to.be.revertedWith(helpers.ERRORS.ERRD_MUST_WHI);
		await ico.whitelistUser(addr1.address);
		await expect(helpers.testTransferCoin(addr1, 21, ico)).not.to.be.reverted;
	});

	it("Should be able to blacklist and unblacklist", async() => {
		await ico.setCrowdsaleStage(1);

		await ico.setUseBlacklist(false);
		await ico.blacklistUser(addr1.address);
		await expect(helpers.testTransferCoin(addr1, 10, ico)).not.to.be.reverted;

		await ico.setUseBlacklist(true);
		await ico.blacklistUser(addr1.address);
		await expect(helpers.testTransferCoin(addr1, 10, ico)).to.be.revertedWith(helpers.ERRORS.ERRD_MUSN_BLK);

		await ico.setUseBlacklist(true);
		await ico.unblacklistUser(addr1.address);
		await expect(helpers.testTransferCoin(addr1, 10, ico)).not.to.be.reverted;

		await ico.setUseBlacklist(false);
	});

	// min transfer
	it("Should respect transfer limits", async() => {
		await ico.setCrowdsaleStage(1);
		console.log("Testing Transfer Limits");

		await ico.setMinuUSDTransfer(9.9999 * 10**6);
		await expect(helpers.testTransferCoin(addr1, 9, ico)).to.be.revertedWith(helpers.ERRORS.ERRD_TRAS_LOW);
		await expect(helpers.testTransferCoin(addr1, 10, ico)).not.to.be.reverted;
		await ico.setMinuUSDTransfer(9.99 * 10**6);
		console.log("Min Transfer is ok");

		await ico.setMaxuUSDTransfer(20.0001 * 10**6);
		await expect(helpers.testTransferCoin(addr1, 21, ico)).to.be.revertedWith(helpers.ERRORS.ERRD_TRAS_HIG);
		await expect(helpers.testTransferCoin(addr1, 20, ico)).not.to.be.reverted;
		await ico.setMaxuUSDTransfer(10_000.001  * 10**6);
		console.log("Max Transfer is ok");

		console.log("getuUSDToClaim: " + await ico.getuUSDToClaim(addr1.address));
		await ico.setMaxuUSDInvestment(130 * 10**6);
		await expect(helpers.testTransferCoin(addr1, 11, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr1, 11, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr1, 80, ico)).to.be.revertedWith(helpers.ERRORS.ERRD_INVT_HIG);
		await ico.setMaxuUSDInvestment(10_001 * 10**6);
		console.log("Max Investment is ok");
	});

	it("Should not be able to deposit beyond caps", async() => {
		await ico.setCrowdsaleStage(1);

		await ico.setMaxuUSDTransfer(21 * 10**6);
		await ico.setMaxuUSDInvestment(80 * 10**6);
		await ico.setHardCapuUSD(100 * 10**6);
		await expect(helpers.testTransferCoin(addr1, 20, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr1, 20, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr1, 20, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr2, 20, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr2, 20, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr2, 20, ico)).to.be.revertedWith(helpers.ERRORS.ERRD_HARD_CAP);
		await ico.setMaxuUSDTransfer(10_000 * 10**6);
		await ico.setMaxuUSDInvestment(10_000 * 10**6);
	});

	it("Should update ICO balance", async() => {
		await ico.setCrowdsaleStage(1);
		await ico.setMinuUSDTransfer(10 * 10**6);

		await expect(helpers.testTransferCoin(addr1, 11, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr2, 11, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr3, 11, ico)).not.to.be.reverted;

		let contributed1 = await ico.getContribution(addr1.address, "COIN");
		let contributed2 = await ico.getContribution(addr2.address, "COIN");
		let contributed3 = await ico.getContribution(addr3.address, "COIN");
		let totalContributed = contributed1.add(contributed2).add(contributed3);
		let balanceOfICO = await ethers.provider.getBalance(ico.address);
		console.log("balance " + balanceOfICO);
		expect(balanceOfICO).to.equal(totalContributed);
	});

	it("Should be able to do big transactions", async() => {
		await ico.setCrowdsaleStage(1);

		// do big transaction
		await ico.whitelistUser(addr1.address);
		await ico.setMaxuUSDTransfer(4_000_000 * 10**6);
		await ico.setMaxuUSDInvestment(4_000_000 * 10**6);
		await ico.setHardCapuUSD(4_000_000 * 10**6);
		await expect(helpers.testTransferCoin(addr1, 3_000_000, ico)).not.to.be.reverted;
		await expect(await ico.getuUSDContribution(addr1.address, "COIN")).to.equal(3_000_000_000_000);
	});

	/********************************************************************************************************/
	/************************************************** Refund **********************************************/
	/********************************************************************************************************/
	it("Should be able to refund Coins to investor", async() => {

		await ico.setCrowdsaleStage(1);

		await expect(helpers.testTransferCoin(addr1, 10, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr2, 10, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr3, 10, ico)).not.to.be.reverted;

		await ico.setCrowdsaleStage(3);

		let balanceOfICO3 = await ethers.provider.getBalance(ico.address);
		console.log("balanceOfICO3: " + balanceOfICO3);

		let contributed1 = await ico.getContribution(addr1.address, "COIN");
		await expect(await ico.connect(addr1).refund("COIN"))
			.to.changeEtherBalances([ico, addr1], [contributed1.mul(-1), contributed1]);
		expect(await ico.getContribution(addr1.address, "COIN")).to.equal(0);
		expect(await ico.getuUSDContribution(addr1.address, "COIN")).to.equal(0);
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(0);

		let contributed2 = await ico.getContribution(addr2.address, "COIN");
		await expect(await ico.connect(addr2).refund("COIN"))
			.to.changeEtherBalances([ico, addr2], [contributed2.mul(-1), contributed2]);
		expect(await ico.getContribution(addr2.address, "COIN")).to.equal(0);
		expect(await ico.getuUSDContribution(addr2.address, "COIN")).to.equal(0);
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(0);

		let contributed3 = await ico.getContribution(addr3.address, "COIN");
		await expect(await ico.connect(addr3).refund("COIN"))
			.to.changeEtherBalances([ico, addr3], [contributed3.mul(-1), contributed3]);
		expect(await ico.getContribution(addr3.address, "COIN")).to.equal(0);
		expect(await ico.getuUSDContribution(addr3.address, "COIN")).to.equal(0);
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(0);

		expect(await ethers.provider.getBalance(ico.address)).to.equal(0);
		
	});

	it("Should be able to refund all Coins", async() => {

		await ico.setCrowdsaleStage(1);

		await expect(helpers.testTransferCoin(addr1, 10, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr2, 10, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr3, 10, ico)).not.to.be.reverted;

		await ico.setCrowdsaleStage(3);

		// refund all
		let contributed1 = await ico.getContribution(addr1.address, "COIN");
		await expect(await ico.refundAddress("COIN", addr1.address)).to.changeEtherBalances([ico, addr1], [contributed1.mul(-1), contributed1]);
		await expect(await ico.getContribution(addr1.address, "COIN")).to.equal(0);
		await expect(await ico.getuUSDToClaim(addr1.address)).to.equal(0);
		let contributed2 = await ico.getContribution(addr2.address, "COIN");
		await expect(await ico.refundAddress("COIN", addr2.address)).to.changeEtherBalances([ico, addr2], [contributed2.mul(-1), contributed2]);
		await expect(await ico.getContribution(addr2.address, "COIN")).to.equal(0);
		await expect(await ico.getuUSDToClaim(addr2.address)).to.equal(0);
		let contributed3 = await ico.getContribution(addr3.address, "COIN");
		await expect(await ico.refundAddress("COIN", addr3.address)).to.changeEtherBalances([ico, addr3], [contributed3.mul(-1), contributed3]);
		await expect(await ico.getContribution(addr3.address, "COIN")).to.equal(0);
		await expect(await ico.getuUSDToClaim(addr3.address)).to.equal(0);

		expect(await ethers.provider.getBalance(ico.address)).to.equal(0);

	});

	/********************************************************************************************************/
	/************************************************** Reset Refund ****************************************/
	/********************************************************************************************************/
	it("Should be able to Reset Refund", async() => {

		// prepare test
		await ico.setCrowdsaleStage(1);

		await expect(helpers.testTransferCoin(addr1, 10, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr2, 10, ico)).not.to.be.reverted;
		await expect(helpers.testTransferCoin(addr3, 10, ico)).not.to.be.reverted;

		await ico.setCrowdsaleStage(3);

		let balanceOfICO3 = await ethers.provider.getBalance(ico.address);
		console.log("balanceOfICO3: " + balanceOfICO3);

		// refund
		let contributed1 = await ico.getContribution(addr1.address, "COIN");
		await expect(await ico.connect(addr1).refund("COIN"))
			.to.changeEtherBalances([ico, addr1], [contributed1.mul(-1), contributed1]);
		expect(await ico.getContribution(addr1.address, "COIN")).to.equal(0);
		expect(await ico.getuUSDContribution(addr1.address, "COIN")).to.equal(0);
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(0);

		let contributed2 = await ico.getContribution(addr2.address, "COIN");
		await expect(await ico.connect(addr2).refund("COIN"))
			.to.changeEtherBalances([ico, addr2], [contributed2.mul(-1), contributed2]);
		expect(await ico.getContribution(addr2.address, "COIN")).to.equal(0);
		expect(await ico.getuUSDContribution(addr2.address, "COIN")).to.equal(0);
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(0);

		let contributed3 = await ico.getContribution(addr3.address, "COIN");
		await expect(await ico.connect(addr3).refund("COIN"))
			.to.changeEtherBalances([ico, addr3], [contributed3.mul(-1), contributed3]);
		expect(await ico.getContribution(addr3.address, "COIN")).to.equal(0);
		expect(await ico.getuUSDContribution(addr3.address, "COIN")).to.equal(0);
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(0);

		expect(await ethers.provider.getBalance(ico.address)).to.equal(0);

		// verify finish
		expect(await ico.owner()).to.equal(owner.address);
		expect(await ico.getCrowdsaleStage()).to.equal(3, 'The stage couldn\'t be set to Finished');
		expect(await ico.getTotaluUSDInvested()).to.equal(29999997);																																		// totaluUSDTInvested
		expect(await ico.getHardCap()).to.equal(300000);
		expect(await ico.getSoftCap()).to.equal(50000);
		expect(await ico.getPriceuUSD()).to.equal(30_000);
		expect(await ico.getPercentVested()).to.equal(0);
		expect(await ico.getVestingId()).to.equal('0x0000000000000000000000000000000000000000000000000000000000000000');
		expect(await ico.getInvestorsCount()).to.equal(3);
		let investorsCount = await ico.getInvestorsCount();
		let investors = await ico.getInvestors();
		for (let i = 0; i < investorsCount; i++) {
			expect(await ico.getuUSDToClaim(investors[i])).to.equal(0);
			expect(await ico.getuUSDInvested(investors[i])).to.equal(9999999);
			expect(await ico.getContribution(addr1.address, 'COIN')).to.equal(0);																														// cAmountInvested
			expect(await ico.getuUSDContribution(addr1.address, 'COIN')).to.equal(0);																												// cuUSDInvested
		}
		expect(await ico.getTokenAddress()).to.equal('0x0000000000000000000000000000000000000000', 'token address should be zero');				// tokenAddress
		expect(await ico.getTargetWalletAddress()).to.equal('0x0000000000000000000000000000000000000000', 'token address should be zero');// targetWalletAddress

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
		expect(await ico.getVestingId()).to.equal('0x0000000000000000000000000000000000000000000000000000000000000000');
		expect(await ico.getInvestorsCount()).to.equal(3);
		investorsCount = await ico.getInvestorsCount();
		investors = await ico.getInvestors();
		for (let i = 0; i < investorsCount; i++) {
			expect(await ico.getuUSDToClaim(investors[i])).to.equal(0);
			expect(await ico.getuUSDInvested(investors[i])).to.equal(9999999);
			expect(await ico.getContribution(addr1.address, 'COIN')).to.equal(0);																														// cAmountInvested
			expect(await ico.getuUSDContribution(addr1.address, 'COIN')).to.equal(0);																												// cuUSDInvested
		}
		expect(await ico.getTokenAddress()).to.equal('0x0000000000000000000000000000000000000000', 'token address should be zero');				// tokenAddress
		expect(await ico.getTargetWalletAddress()).to.equal('0x0000000000000000000000000000000000000000', 'token address should be zero');// targetWalletAddress

	});

});
