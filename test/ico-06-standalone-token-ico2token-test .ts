import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("ico-06-standalone-token-ico2token-test ", function () {
	const hre = require("hardhat");

	let CrowdsaleFacet, ico: Contract;
	let ERC20Facet, token: Contract;
	let FOO, foo: Contract;
	let ChainLinkAggregator, chainLinkAggregator: Contract;
	let owner: SignerWithAddress, project: SignerWithAddress, liquidity: SignerWithAddress;
	let addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addrs;

	let ERRD_MUST_NST: string = 'ERRD_MUST_NST' // ICO must be not started
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

		CrowdsaleFacet = await ethers.getContractFactory("CrowdsaleFacet");
		ico = await CrowdsaleFacet.deploy();
		await ico.deployed();
		await expect(ico.createCrowdsale(30_000, 300_000_000_000, 50_000_000_000, 1_000_000_000, 100_000_000_000, 100_000_000_000, 9_999_999)).not.to.be.reverted;
		await expect(ico.setPaymentToken("FOO", ico.address, chainLinkAggregator.address, Math.floor(1100*1e6), 18)).not.to.be.reverted;
		console.log("deployed ICO:" + ico.address);

		ERC20Facet = await ethers.getContractFactory("ERC20Facet");
		token = await ERC20Facet.deploy();
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
		token.transfer(ico.address, numTokensWithDecimals1);
		await expect(() => ico.connect(addr1).claim())
			.to.changeTokenBalances(token, [ico, addr1], [BigInt(-1) * numTokensWithDecimals1, numTokensWithDecimals1]);
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(0);
		expect(await ico.getContribution(addr1.address, 'FOO')).to.equal(0);
		expect(await ico.getuUSDContribution(addr1.address, 'FOO')).to.equal(0);

		// claim tokens from investors 2
		let uUSDContributed2 = await ico.getuUSDToClaim(addr2.address);
		let numTokensWithDecimals2 = BigInt(uUSDContributed2) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals2);
		await expect(() => ico.connect(addr2).claim())
			.to.changeTokenBalances(token, [ico, addr2], [BigInt(-1) * numTokensWithDecimals2, numTokensWithDecimals2]);
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(0);
		expect(await ico.getContribution(addr2.address, 'FOO')).to.equal(0);
		expect(await ico.getuUSDContribution(addr2.address, 'FOO')).to.equal(0);

		// claim tokens from investors 3
		let uUSDContributed3 = await ico.getuUSDToClaim(addr3.address);
		let numTokensWithDecimals3 = BigInt(uUSDContributed3) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals3);
		await expect(() => ico.connect(addr3).claim())
			.to.changeTokenBalances(token, [ico, addr3], [BigInt(-1) * numTokensWithDecimals3, numTokensWithDecimals3]);
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
		token.transfer(ico.address, numTokensWithDecimals1);
		await expect(() => ico.claimAddress(addr1.address))
			.to.changeTokenBalances(token, [ico, addr1], [BigInt(-1) * numTokensWithDecimals1, numTokensWithDecimals1]);
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(0);
		expect(await ico.getContribution(addr1.address, 'FOO')).to.equal(0);
		expect(await ico.getuUSDContribution(addr1.address, 'FOO')).to.equal(0);

		// claim tokens from investors 2
		let uUSDContributed2 = await ico.getuUSDToClaim(addr2.address);
		let numTokensWithDecimals2 = BigInt(uUSDContributed2) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals2);
		await expect(() => ico.claimAddress(addr2.address))
			.to.changeTokenBalances(token, [ico, addr2], [BigInt(-1) * numTokensWithDecimals2, numTokensWithDecimals2]);
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(0);
		expect(await ico.getContribution(addr2.address, 'FOO')).to.equal(0);
		expect(await ico.getuUSDContribution(addr2.address, 'FOO')).to.equal(0);

		// claim tokens from investors 3
		let uUSDContributed3 = await ico.getuUSDToClaim(addr3.address);
		let numTokensWithDecimals3 = BigInt(uUSDContributed3) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals3);
		await expect(() => ico.claimAddress(addr3.address))
			.to.changeTokenBalances(token, [ico, addr3], [BigInt(-1) * numTokensWithDecimals3, numTokensWithDecimals3]);
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(0);
		expect(await ico.getContribution(addr3.address, 'FOO')).to.equal(0);
		expect(await ico.getuUSDContribution(addr3.address, 'FOO')).to.equal(0);

	});


	/********************************************************************************************************/
	/************************************************** Reset Claim *****************************************/
	/********************************************************************************************************/
	it("Should be able to Reset Refund", async() => {

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

		// verify finish
		expect(await ico.owner()).to.equal(owner.address);
		expect(await ico.getCrowdsaleStage()).to.equal(3, 'The stage couldn\'t be set to Finished');
		expect(await ico.getTotaluUSDInvested()).to.equal(30000000);																																		// totaluUSDTInvested
		expect(await ico.getHardCap()).to.equal(300000);
		expect(await ico.getSoftCap()).to.equal(50000);
		expect(await ico.getPriceuUSD()).to.equal(30_000);
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
		expect(await ico.getCrowdsaleStage()).to.equal(0, 'The stage couldn\'t be set to Finished');
		expect(await ico.getTotaluUSDInvested()).to.equal(0);																																							// totaluUSDTInvested
		expect(await ico.getHardCap()).to.equal(0);
		expect(await ico.getSoftCap()).to.equal(0);
		expect(await ico.getPriceuUSD()).to.equal(0);
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

	it("Should be able to Reset Claim", async() => {

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
		token.transfer(ico.address, numTokensWithDecimals1);
		await expect(() => ico.connect(addr1).claim())
			.to.changeTokenBalances(token, [ico, addr1], [BigInt(-1) * numTokensWithDecimals1, numTokensWithDecimals1]);
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(0);
		expect(await ico.getContribution(addr1.address, 'FOO')).to.equal(0);
		expect(await ico.getuUSDContribution(addr1.address, 'FOO')).to.equal(0);

		// claim tokens from investors 2
		let uUSDContributed2 = await ico.getuUSDToClaim(addr2.address);
		let numTokensWithDecimals2 = BigInt(uUSDContributed2) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals2);
		await expect(() => ico.connect(addr2).claim())
			.to.changeTokenBalances(token, [ico, addr2], [BigInt(-1) * numTokensWithDecimals2, numTokensWithDecimals2]);
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(0);
		expect(await ico.getContribution(addr2.address, 'FOO')).to.equal(0);
		expect(await ico.getuUSDContribution(addr2.address, 'FOO')).to.equal(0);

		// claim tokens from investors 3
		let uUSDContributed3 = await ico.getuUSDToClaim(addr3.address);
		let numTokensWithDecimals3 = BigInt(uUSDContributed3) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals3);
		await expect(() => ico.connect(addr3).claim())
			.to.changeTokenBalances(token, [ico, addr3], [BigInt(-1) * numTokensWithDecimals3, numTokensWithDecimals3]);
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(0);
		expect(await ico.getContribution(addr3.address, 'FOO')).to.equal(0);
		expect(await ico.getuUSDContribution(addr3.address, 'FOO')).to.equal(0);

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
		expect(await ico.getCrowdsaleStage()).to.equal(3, 'The stage couldn\'t be set to Finished');
		expect(await ico.getTotaluUSDInvested()).to.equal(56999999997);																																		// totaluUSDTInvested
		expect(await ico.getHardCap()).to.equal(300000);
		expect(await ico.getSoftCap()).to.equal(50000);
		expect(await ico.getPriceuUSD()).to.equal(30_000);
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
		expect(await ico.getCrowdsaleStage()).to.equal(0, 'The stage couldn\'t be set to Finished');
		expect(await ico.getTotaluUSDInvested()).to.equal(0);																																							// totaluUSDTInvested
		expect(await ico.getHardCap()).to.equal(0);
		expect(await ico.getSoftCap()).to.equal(0);
		expect(await ico.getPriceuUSD()).to.equal(0);
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
