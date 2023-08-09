import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("ico-3-diamond-token-test", function () {
	const hre = require("hardhat");

	let CatallacticICO, ico: Contract;
	let CatallacticERC20Facet, token: Contract;
	let FOO, foo: Contract;
	let ChainLinkAggregator, chainLinkAggregator: Contract;
	let owner: SignerWithAddress, project: SignerWithAddress, liquidity: SignerWithAddress;
	let addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addrs;

	let ERRW_OWNR_NOT: string = 'ERRW_OWNR_NOT' // Ownable: caller is not the owner
	let ERRP_INDX_PAY: string = 'ERRP_INDX_PAY' // Wrong index
	let ERRD_MUST_ONG: string = 'ERRD_MUST_ONG' // ICO must be ongoing
	let ERRD_MUSN_BLK: string = 'ERRD_MUSN_BLK' // must not be blacklisted
	let ERRD_TRAS_LOW: string = 'ERRD_TRAS_LOW' // transfer amount too low
	let ERRD_TRAS_HIG: string = 'ERRD_TRAS_HIG' // transfer amount too high
	let ERRD_MUST_WHI: string = 'ERRD_MUST_WHI' // must be whitelisted
	let ERRD_INVT_HIG: string = 'ERRD_INVT_HIG' // total invested amount too high
	let ERRD_HARD_CAP: string = 'ERRD_HARD_CAP' // amount higher than available
	let ERRD_ALLO_LOW: string = 'ERRD_ALLO_LOW' // insuffient allowance
	let ERRR_MUST_FIN: string = 'ERRR_MUST_FIN' // ICO must be finished
	let ERRR_PASS_SOF: string = 'ERRR_PASS_SOF' // Passed SoftCap. No refund
	let ERRR_ZERO_REF: string = 'ERRR_ZERO_REF' // Nothing to refund
	let ERRR_WITH_REF: string = 'ERRR_WITH_REF' // Unable to refund
	let ERRC_MUST_FIN: string = 'ERRC_MUST_FIN' // ICO must be finished
	let ERRC_NPAS_SOF: string = 'ERRC_NPAS_SOF' // Not passed SoftCap
	let ERRC_MISS_TOK: string = 'ERRC_MISS_TOK' // Provide Token
	let ERRW_MUST_FIN: string = 'ERRW_MUST_FIN' // ICO must be finished
	let ERRW_NPAS_SOF: string = 'ERRW_NPAS_SOF' // Not passed SoftCap
	let ERRW_INVA_ADD: string = 'ERRW_INVA_ADD' // Invalid Address
	let ERRR_ZERO_CLM: string = 'ERRR_ZERO_CLM' // Nothing to claim
	let ERRW_MISS_WAL: string = 'ERRW_MISS_WAL' // Provide Wallet
	let ERRR_ZERO_WIT: string = 'ERRR_ZERO_WIT' // Nothing to withdraw
	let ERRR_WITH_BAD: string = 'ERRR_WITH_BAD' // Unable to withdraw

	/********************************************************************************************************/
	/************************************************** hooks ***********************************************/
	/********************************************************************************************************/
	before(async() => {
		console.log('-------- Starting Tests -------');

		// uncomment to get real exchange values
		/*let usdPerEther = async () => {
			return fetch("https://api.coinbase.com/v2/exchange-rates?currency=ETH", { method: "GET", redirect: "follow" })
				.then((response) => response.json())
				.then((result) => {return(result.data.rates.USD)})
				.catch((error) => {return(error)});
		}
		numUsdPerEther = await usdPerEther()
		console.log('numUsdPerEther: ' + numUsdPerEther);*/

	});

	beforeEach(async() => {
		//console.log('--------------------');
		await hre.network.provider.send("hardhat_reset");

		ChainLinkAggregator = await ethers.getContractFactory("DemoMockAggregator", owner);
		chainLinkAggregator = await ChainLinkAggregator.deploy();
		await chainLinkAggregator.deployed();
		console.log("ChainLinkAggregator:" + chainLinkAggregator.address);

		CatallacticICO = await ethers.getContractFactory("CatallacticICO");
		ico = await CatallacticICO.deploy();
		await ico.deployed();
		ico.initialize();
		await ico.setPaymentToken("FOO", ico.address, chainLinkAggregator.address, Math.floor(1100*1e6), 18);
		console.log("deployed ICO:" + ico.address);

		CatallacticERC20Facet = await ethers.getContractFactory("CatallacticERC20Facet");
		token = await CatallacticERC20Facet.deploy();
		await token.deployed();
		token.initialize();
		console.log("deployed Token:" + token.address);

		FOO = await ethers.getContractFactory("FOO");
		foo = await FOO.deploy();
		await foo.deployed();
		foo.initialize();
		console.log("deployed FOO:" + foo.address);

		[owner, project, liquidity, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
		[owner, project, liquidity, addr1, addr2, addr3, ...addrs].forEach(async(account, i) => {
			let balance = await ethers.provider.getBalance(account.address);
			console.log('%d - address: %s ; balance: %s', ++i, account.address, balance);
		});

		
	});

	afterEach(async() => {
		await logStatus();
		console.log('--------------------');
	});
	
	after(async() => {
		console.log('--------- Ending Tests --------');
	});

	/********************************************************************************************************/
	/********************************************* supporting functions *************************************/
	/********************************************************************************************************/
	// currency conversions
	let numUsdPerEther: number = 1100;

	let etherToUsd = function (ether: number) {
		return ether * numUsdPerEther;
	}
	let usdToEther = function (usd: number) {
		return usd / numUsdPerEther;
	}
	let weiToUsd = function (wei: BigNumber) {
		return etherToUsd(Number(ethers.utils.formatEther(wei)));
	}
	let usdToWei = function (usd: number) {
		return ethers.utils.parseUnits((usdToEther(usd).toString()));
	}
	let stringToBytes5 = function (str: string) {
		return ethers.utils.hexZeroPad(ethers.utils.toUtf8Bytes(str), 5);
	}
	let bytes5ToString = function (hexString: string) {
		return ethers.utils.toUtf8String(hexString);
	}
	let tokenToUsd = async function (token: number) {
		console.log("UUSD_PER_TOKEN: ");
		let tokenInfo = await ico.getPaymentToken('FOO');
		let UUSD_PER_TOKEN = tokenInfo[2];
		console.log("UUSD_PER_TOKEN: " + UUSD_PER_TOKEN);
		return token * UUSD_PER_TOKEN;
	}
	let usdToToken = async function (usd: number) {
		console.log("UUSD_PER_TOKEN: ");
		let tokenInfo = await ico.getPaymentToken('FOO');
		let UUSD_PER_TOKEN = tokenInfo[2];
		console.log("UUSD_PER_TOKEN: " + UUSD_PER_TOKEN);
		console.log("usdToToken: " + usd * 10**6 / UUSD_PER_TOKEN);
		return usd * 10**6 / UUSD_PER_TOKEN;
	}
	let usdToTokenWithDecimals = async function (usd: number) {
		let change = await usdToToken(usd) * 10**18;
		return parseInt(change.toString());
	}

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

	it("Should do number conversions.", async() => {

		console.log("usd to wei to usd: " + weiToUsd(usdToWei(10)));
		console.log("usd to eher to usd: " + etherToUsd(usdToEther(10)));

	});

	// transfer helper
	let testTransferToken = async (addr: SignerWithAddress, token: string, usdAmount: number) => {
		console.log("purchase of : " + usdAmount + " USD of " + token + " by " + addr.address);

		let tokenInfo = await ico.getPaymentToken(token);
		let UUSD_PER_TOKEN = tokenInfo[2];
		let rawAmount = usdAmount * 1e6 / UUSD_PER_TOKEN;
		let decimals = tokenInfo[3];
		let amountToTransfer = ethers.utils.parseUnits(rawAmount.toString(), decimals).toString();
		await foo.connect(addr).approve(ico.address, amountToTransfer);
		return await ico.connect(addr).depositTokens(token, amountToTransfer);
	};

	let logStatus = async () => {

		console.log("\getTotaluUSDInvested: " + await ico.getTotaluUSDInvested() + " USD");

		let price = await ico.getPriceuUSD();

		let investorsCount = await ico.getInvestorsCount();
		let investors = await ico.getInvestors();
		console.log("\tInvestors: ");
		for (let i = 0; i < investorsCount; i++) {
			let ether = await ethers.provider.getBalance(investors[i]);
			let uusd = await ico.getuUSDToClaim(investors[i]);
			let tokens = Math.floor(uusd / price);
			console.log("\t\t* " + investors[i] + " ether: " + weiToUsd(ether) + " USD" + "; tokens: " + tokens + " CYGAS = " + (uusd/10**6) + " USD");
		}

	}

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

		await ico.setCrowdsaleStage(1);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await expect(testTransferToken(addr1, 'FOO', 10)).not.to.be.reverted;
		expect((await ico.getPaymentToken("FOO"))[4]).to.equal(10000000, 'Invested amount must be accounted');																			// uUSDInvested
		expect((await ico.getPaymentToken("FOO"))[5]).to.equal(BigInt((1 * 38744672607516470).toString()), 'Invested amount must be accounted');		// amountInvested			

		await expect(testTransferToken(addr2, 'FOO', 10)).not.to.be.reverted;
		expect((await ico.getPaymentToken("FOO"))[4]).to.equal(2 * 10000000, 'Invested amount must be accounted');																	// uUSDInvested
		expect((await ico.getPaymentToken("FOO"))[5]).to.equal(BigInt((2 * 38744672607516470).toString()), 'Invested amount must be accounted');		// amountInvested

		await expect(testTransferToken(addr3, 'FOO', 10)).not.to.be.reverted;
		expect((await ico.getPaymentToken("FOO"))[4]).to.equal(3 * 10000000, 'Invested amount must be accounted');																	// uUSDInvested
		//expect((await ico.getPaymentToken("FOO"))[5]).to.equal(BigInt((3 * 38744672607516470).toString()), 'Invested amount must be accounted');	// amountInvested
	});

	it("Should allow dynamic prices", async() => {

		await ico.setCrowdsaleStage(1);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(4*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		// use default price
		await expect(testTransferToken(addr1, 'FOO', 10)).not.to.be.reverted;
		expect((await ico.getPaymentToken("FOO"))[4]).to.equal(10 * 10**6, 'Invested amount must be accounted');																		// uUSDInvested
		expect((await ico.getPaymentToken("FOO"))[5]).to.equal(BigInt((2.5 * 10**18).toString()), 'Invested amount must be accounted');							// amountInvested

		// use dynamic price - same price
		await ico.setDynamicPrice(true);
		await chainLinkAggregator.setDynamicPrice(4);
		await expect(testTransferToken(addr1, 'FOO', 10)).not.to.be.reverted;
		expect((await ico.getPaymentToken("FOO"))[4]).to.equal(2 * 10 * 10**6, 'Invested amount must be accounted');																// uUSDInvested
		expect((await ico.getPaymentToken("FOO"))[5]).to.equal(BigInt((2 * 2.5 * 10**18).toString()), 'Invested amount must be accounted');					// amountInvested

		// use dynamic price - double price
		await ico.setDynamicPrice(true);
		await chainLinkAggregator.setDynamicPrice(8);
		await expect(testTransferToken(addr1, 'FOO', 10)).not.to.be.reverted;
		expect((await ico.getPaymentToken("FOO"))[4]).to.equal(4 * 10 * 10**6, 'Invested amount must be accounted');																// uUSDInvested
		expect((await ico.getPaymentToken("FOO"))[5]).to.equal(BigInt((3 * 2.5 * 10**18).toString()), 'Invested amount must be accounted');					// amountInvested

		// use dynamic price - double price
		await ico.setDynamicPrice(true);
		await chainLinkAggregator.setDynamicPrice(0);
		await expect(testTransferToken(addr1, 'FOO', 10)).not.to.be.reverted;
		expect((await ico.getPaymentToken("FOO"))[4]).to.equal(5 * 10 * 10**6, 'Invested amount must be accounted');																	// uUSDInvested
		expect((await ico.getPaymentToken("FOO"))[5]).to.equal(BigInt((8.75 * 10**18).toString()), 'Invested amount must be accounted');		// amountInvested

	});

	/********************************************************************************************************/
	/********************************************** Investors ***********************************************/
	/********************************************************************************************************/
	it("Should count investors", async() => {

		await ico.setCrowdsaleStage(1);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await expect(testTransferToken(addr1, 'FOO', 10)).not.to.be.reverted;
		await expect(testTransferToken(addr2, 'FOO', 10)).not.to.be.reverted;
		await expect(testTransferToken(addr3, 'FOO', 10)).not.to.be.reverted;

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
		await ico.setCrowdsaleStage(1);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(4*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		// update balances
		await expect(() => testTransferToken(addr1, 'FOO', 10))
			.to.changeTokenBalances(foo, [ico, addr1], [BigInt((await usdToTokenWithDecimals(10)).toString()), BigInt((-1*(await usdToTokenWithDecimals(10))).toString())]);

		// update counters
		expect(await ico.getContribution(addr1.address, 'FOO')).to.equal(BigInt(await usdToTokenWithDecimals(10)));																						// cAmountInvested
		expect(await ico.getuUSDContribution(addr1.address, 'FOO')).to.equal(10 * 10**6);																																			// cuUSDInvested
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(10 * 10**6, 'Investor USD contributed is wrong');																						// uUSDToPay
		expect((await ico.getPaymentToken("FOO"))[4]).to.equal(10 * 10**6, 'Invested amount must be accounted');																							// uUSDInvested
		expect((await ico.getPaymentToken("FOO"))[5]).to.equal(BigInt((await usdToTokenWithDecimals(10)).toString()), 'Investor USD contributed is wrong');		// amountInvested
		expect(await ico.getTotaluUSDInvested()).to.equal(10 * 10**6);																																												// totaluUSDTInvested
		
	});

	// normal
	it("Should be able to deposit only if Ongoing", async() => {

		await ico.setCrowdsaleStage(0);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await expect(testTransferToken(addr1, 'FOO', 10)).to.be.revertedWith('ERRD_MUST_ONG');

		// bug overflow -> workaround use BigInt
		// bug BigInt -> workaround use to String() https://stackoverflow.com/questions/70968922/assigning-bigint-stores-wrong-number-number1
		await ico.setCrowdsaleStage(1);
		await expect(() => testTransferToken(addr1, 'FOO', 10))
			.to.changeTokenBalances(foo, [ico, addr1], [BigInt((await usdToTokenWithDecimals(10)).toString()), BigInt((-1*(await usdToTokenWithDecimals(10))).toString())]);

		await ico.setCrowdsaleStage(2);
		await expect(testTransferToken(addr1, 'FOO', 10)).to.be.revertedWith('ERRD_MUST_ONG')

		await ico.setCrowdsaleStage(3);
		await expect(testTransferToken(addr1, 'FOO', 10)).to.be.revertedWith('ERRD_MUST_ONG');
	});

	it("Should be able to whitelist and unwhitelist", async() => {
		await ico.setCrowdsaleStage(1);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		// whitelisting enabled, small transfer
		await ico.setWhitelistuUSDThreshold(30 * 10**6);
		await ico.unwhitelistUser(addr1.address);
		await expect(testTransferToken(addr1, 'FOO', 31)).to.be.revertedWith('ERRD_MUST_WHI');
		await ico.whitelistUser(addr1.address);
		await expect(testTransferToken(addr1, 'FOO', 31)).not.to.be.reverted;
	});

	it("Should be able to blacklist and unblacklist", async() => {
		await ico.setCrowdsaleStage(1);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await ico.setUseBlacklist(false);
		await ico.blacklistUser(addr1.address);
		await expect(testTransferToken(addr1, 'FOO', 10)).not.to.be.reverted;

		await ico.setUseBlacklist(true);
		await ico.blacklistUser(addr1.address);
		await expect(testTransferToken(addr1, 'FOO', 10)).to.be.revertedWith('ERRD_MUSN_BLK');

		await ico.setUseBlacklist(true);
		await ico.unblacklistUser(addr1.address);
		await expect(testTransferToken(addr1, 'FOO', 10)).not.to.be.reverted;

		await ico.setUseBlacklist(false);
	});

	// min transfer
	it("Should respect transfer limits", async() => {
		await ico.setCrowdsaleStage(1);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await ico.setMinuUSDTransfer(9.9999 * 10**6);
		await expect(testTransferToken(addr1, 'FOO', 9)).to.be.revertedWith('ERRD_TRAS_LOW');
		await expect(testTransferToken(addr1, 'FOO', 10)).not.to.be.reverted;
		await ico.setMinuUSDTransfer(9.99 * 10**6);

		await ico.setMaxuUSDTransfer(20.0001 * 10**6);
		await expect(testTransferToken(addr1, 'FOO', 21)).to.be.revertedWith('ERRD_TRAS_HIG');
		await expect(testTransferToken(addr1, 'FOO', 20)).not.to.be.reverted;
		await ico.setMaxuUSDTransfer(10_000.001  * 10**6);

		console.log("getuUSDToClaim: " + await ico.getuUSDToClaim(addr1.address));
		await ico.setMaxuUSDInvestment(50 * 10**6);
		await expect(testTransferToken(addr1, 'FOO', 10)).not.to.be.reverted;
		await expect(testTransferToken(addr1, 'FOO', 10)).not.to.be.reverted;
		await expect(testTransferToken(addr1, 'FOO', 40)).to.be.revertedWith('ERRD_INVT_HIG');
		await ico.setMaxuUSDInvestment(10_001 * 10**6);

	});

	// beyond hard cap
	it("Should not be able to deposit beyond caps", async() => {
		await ico.setCrowdsaleStage(1);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await ico.setMaxuUSDTransfer(21 * 10**6);
		await ico.setMaxuUSDInvestment(80 * 10**6);
		await ico.setHardCapuUSD(100 * 10**6);
		await expect(testTransferToken(addr1, 'FOO', 20)).not.to.be.reverted;
		await expect(testTransferToken(addr1, 'FOO', 20)).not.to.be.reverted;
		await expect(testTransferToken(addr1, 'FOO', 20)).not.to.be.reverted;
		await expect(testTransferToken(addr2, 'FOO', 20)).not.to.be.reverted;
		await expect(testTransferToken(addr2, 'FOO', 20)).to.be.revertedWith(ERRD_HARD_CAP);
		await ico.setMaxuUSDTransfer(10_000 * 10**6);
		await ico.setMaxuUSDInvestment(10_000 * 10**6);
	});

	it("Should update ICO balance", async() => {
		await ico.setCrowdsaleStage(1);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await expect(testTransferToken(addr1, 'FOO', 10)).not.to.be.reverted;
		await expect(testTransferToken(addr2, 'FOO', 10)).not.to.be.reverted;
		await expect(testTransferToken(addr3, 'FOO', 10)).not.to.be.reverted;

		let contributed1 = await ico.getContribution(addr1.address, "FOO");
		expect(contributed1).to.equal(BigInt((await usdToTokenWithDecimals(10)).toString()));
		let contributed2 = await ico.getContribution(addr2.address, "FOO");
		expect(contributed2).to.equal(BigInt((await usdToTokenWithDecimals(10)).toString()));
		let contributed3 = await ico.getContribution(addr3.address, "FOO");
		expect(contributed3).to.equal(BigInt((await usdToTokenWithDecimals(10)).toString()));
		let totalContributed = contributed1.add(contributed2).add(contributed3);
		let balanceOfICO = await foo.balanceOf(ico.address);
		console.log("balance " + balanceOfICO);
		expect(balanceOfICO).to.equal(totalContributed);
	});

	it("Should be able to do big transactions", async() => {
		await ico.setCrowdsaleStage(1);

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
		await expect(testTransferToken(addr1, 'FOO', 3_000_000)).not.to.be.reverted;
		await expect(await ico.getuUSDContribution(addr1.address, "FOO")).to.equal(3_000_000_000_000);
	});

	/********************************************************************************************************/
	/************************************************** Refund **********************************************/
	/********************************************************************************************************/
	it("Should be able to refund Tokens to investor", async() => {

		await ico.setCrowdsaleStage(1);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await expect(testTransferToken(addr1, 'FOO', 10)).not.to.be.reverted;
		await expect(testTransferToken(addr2, 'FOO', 10)).not.to.be.reverted;
		await expect(testTransferToken(addr3, 'FOO', 10)).not.to.be.reverted;

		await ico.setCrowdsaleStage(3);

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

		await ico.setCrowdsaleStage(1);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await expect(testTransferToken(addr1, 'FOO', 10)).not.to.be.reverted;
		await expect(testTransferToken(addr2, 'FOO', 10)).not.to.be.reverted;
		await expect(testTransferToken(addr3, 'FOO', 10)).not.to.be.reverted;

		await ico.setCrowdsaleStage(3);

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
	/************************************************ Claim *************************************************/
	/********************************************************************************************************/
	it("Should be able to claim Tokens", async() => {

		// prepare test
		await ico.setCrowdsaleStage(1);

		await ico.setMaxuUSDTransfer(20_000_000 * 10**6);
		await ico.setMaxuUSDInvestment(140_000_000 * 10**6);
		await ico.setWhitelistuUSDThreshold(20_000_000 * 10**6);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await expect(testTransferToken(addr1, 'FOO', 19000)).not.to.be.reverted;
		await expect(testTransferToken(addr2, 'FOO', 19000)).not.to.be.reverted;
		await expect(testTransferToken(addr3, 'FOO', 19000)).not.to.be.reverted;

		await ico.setTokenAddress(token.address);

		await ico.setCrowdsaleStage(3);

		let price: number = await ico.getPriceuUSD();
		console.log("price " + price);

		// claim tokens from investors 1
		let uUSDContributed1 = await ico.getuUSDToClaim(addr1.address);
		let numTokensWithDecimals1 = BigInt(uUSDContributed1) * BigInt(10**18) / BigInt(price);
		await token.approve(ico.address, numTokensWithDecimals1);
		expect(await token.allowance(owner.address, ico.address)).to.equal(numTokensWithDecimals1);
		await expect(() => ico.connect(addr1).claim())
			.to.changeTokenBalances(token, [owner, addr1], [BigInt(-1) * numTokensWithDecimals1, numTokensWithDecimals1]);
		expect(await token.allowance(owner.address, ico.address)).to.equal(0);
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(0);
		expect(await ico.getContribution(addr1.address, 'FOO')).to.equal(0);
		expect(await ico.getuUSDContribution(addr1.address, 'FOO')).to.equal(0);

		// claim tokens from investors 2
		let uUSDContributed2 = await ico.getuUSDToClaim(addr2.address);
		let numTokensWithDecimals2 = BigInt(uUSDContributed2) * BigInt(10**18) / BigInt(price);
		await token.approve(ico.address, numTokensWithDecimals2);
		expect(await token.allowance(owner.address, ico.address)).to.equal(numTokensWithDecimals1);
		await expect(() => ico.connect(addr2).claim())
			.to.changeTokenBalances(token, [owner, addr2], [BigInt(-1) * numTokensWithDecimals2, numTokensWithDecimals2]);
		expect(await token.allowance(owner.address, ico.address)).to.equal(0);
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(0);
		expect(await ico.getContribution(addr2.address, 'FOO')).to.equal(0);
		expect(await ico.getuUSDContribution(addr2.address, 'FOO')).to.equal(0);

		// claim tokens from investors 3
		let uUSDContributed3 = await ico.getuUSDToClaim(addr3.address);
		let numTokensWithDecimals3 = BigInt(uUSDContributed3) * BigInt(10**18) / BigInt(price);
		await token.approve(ico.address, numTokensWithDecimals3);
		expect(await token.allowance(owner.address, ico.address)).to.equal(numTokensWithDecimals1);
		await expect(() => ico.connect(addr3).claim())
			.to.changeTokenBalances(token, [owner, addr3], [BigInt(-1) * numTokensWithDecimals3, numTokensWithDecimals3]);
		expect(await token.allowance(owner.address, ico.address)).to.equal(0);
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(0);
		expect(await ico.getContribution(addr3.address, 'FOO')).to.equal(0);
		expect(await ico.getuUSDContribution(addr3.address, 'FOO')).to.equal(0);

	});

	it("Should be able to claim Tokens by admin", async() => {

		// prepare test
		await ico.setCrowdsaleStage(1);

		await ico.setMaxuUSDTransfer(20_000_000 * 10**6);
		await ico.setMaxuUSDInvestment(140_000_000 * 10**6);
		await ico.setWhitelistuUSDThreshold(20_000_000 * 10**6);

		// prepare test users
		await ico.setPaymentToken("FOO", foo.address, chainLinkAggregator.address, Math.floor(258.1*1e6), 18);
		let amountToTransfer = ethers.utils.parseUnits("1000000", 18).toString();
		await foo.transfer(addr1.address, amountToTransfer);
		await foo.transfer(addr2.address, amountToTransfer);
		await foo.transfer(addr3.address, amountToTransfer);

		await expect(testTransferToken(addr1, 'FOO', 19000)).not.to.be.reverted;
		await expect(testTransferToken(addr2, 'FOO', 19000)).not.to.be.reverted;
		await expect(testTransferToken(addr3, 'FOO', 19000)).not.to.be.reverted;

		await ico.setTokenAddress(token.address);

		await ico.setCrowdsaleStage(3);

		let price: number = await ico.getPriceuUSD();
		console.log("price " + price);

		// claim tokens from investors 1
		let uUSDContributed1 = await ico.getuUSDToClaim(addr1.address);
		let numTokensWithDecimals1 = BigInt(uUSDContributed1) * BigInt(10**18) / BigInt(price);
		await token.approve(ico.address, numTokensWithDecimals1);
		expect(await token.allowance(owner.address, ico.address)).to.equal(numTokensWithDecimals1);
		await expect(() => ico.claimAddress(addr1.address))
			.to.changeTokenBalances(token, [owner, addr1], [BigInt(-1) * numTokensWithDecimals1, numTokensWithDecimals1]);
		expect(await token.allowance(owner.address, ico.address)).to.equal(0);
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(0);
		expect(await ico.getContribution(addr1.address, 'FOO')).to.equal(0);
		expect(await ico.getuUSDContribution(addr1.address, 'FOO')).to.equal(0);

		// claim tokens from investors 2
		let uUSDContributed2 = await ico.getuUSDToClaim(addr2.address);
		let numTokensWithDecimals2 = BigInt(uUSDContributed2) * BigInt(10**18) / BigInt(price);
		await token.approve(ico.address, numTokensWithDecimals2);
		expect(await token.allowance(owner.address, ico.address)).to.equal(numTokensWithDecimals1);
		await expect(() => ico.claimAddress(addr2.address))
			.to.changeTokenBalances(token, [owner, addr2], [BigInt(-1) * numTokensWithDecimals2, numTokensWithDecimals2]);
		expect(await token.allowance(owner.address, ico.address)).to.equal(0);
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(0);
		expect(await ico.getContribution(addr2.address, 'FOO')).to.equal(0);
		expect(await ico.getuUSDContribution(addr2.address, 'FOO')).to.equal(0);

		// claim tokens from investors 3
		let uUSDContributed3 = await ico.getuUSDToClaim(addr3.address);
		let numTokensWithDecimals3 = BigInt(uUSDContributed3) * BigInt(10**18) / BigInt(price);
		await token.approve(ico.address, numTokensWithDecimals3);
		expect(await token.allowance(owner.address, ico.address)).to.equal(numTokensWithDecimals1);
		await expect(() => ico.claimAddress(addr3.address))
			.to.changeTokenBalances(token, [owner, addr3], [BigInt(-1) * numTokensWithDecimals3, numTokensWithDecimals3]);
		expect(await token.allowance(owner.address, ico.address)).to.equal(0);
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(0);
		expect(await ico.getContribution(addr3.address, 'FOO')).to.equal(0);
		expect(await ico.getuUSDContribution(addr3.address, 'FOO')).to.equal(0);

	});

	/********************************************************************************************************/
	/*********************************************** Withdraw ***********************************************/
	/********************************************************************************************************/
	it("Should be able to Withdraw Tokens", async() => {

		await ico.setCrowdsaleStage(1);

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

		await expect(testTransferToken(addr1, 'FOO', 19000)).not.to.be.reverted;
		await expect(testTransferToken(addr2, 'FOO', 19000)).not.to.be.reverted;
		await expect(testTransferToken(addr3, 'FOO', 19000)).not.to.be.reverted;

		await ico.setCrowdsaleStage(3);

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
