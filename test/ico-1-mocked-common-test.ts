import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

// describe.skip
describe("ico-1-mocked-common-test", function () {
	const hre = require("hardhat");

	let CatallacticICO, ico: Contract;
	let CatallacticERC20Facet, token: Contract;
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
	});

	beforeEach(async() => {
		//console.log('--------------------');
		await hre.network.provider.send("hardhat_reset");

		CatallacticICO = await ethers.getContractFactory("CatallacticICO");
		ico = await CatallacticICO.deploy();
		await ico.deployed();
		ico.initialize();
		await ico.setPaymentToken("COIN", ico.address, "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", Math.floor(1100*1e6), 18);
		console.log("deployed ICO:" + ico.address);

		CatallacticERC20Facet = await ethers.getContractFactory("CatallacticERC20Facet");
		token = await CatallacticERC20Facet.deploy();
		await token.deployed();
		console.log("deployed Token:" + token.address);

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
		console.log("\tproject address: " + project.address);
		console.log("\tliquidity address: " + liquidity.address);
		console.log("\n");

	});

	it("Should do number conversions.", async() => {

		console.log("usd to wei to usd: " + weiToUsd(usdToWei(10)));
		console.log("usd to eher to usd: " + etherToUsd(usdToEther(10)));

	});

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
	/*************************************************** Owner **********************************************/
	/********************************************************************************************************/
	it("Only Owner functions", async() => {
		await expect(ico.connect(addr1).setWhitelistuUSDThreshold(10**6)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(ico.connect(addr1).whitelistUser(addr1.address)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(ico.connect(addr1).unwhitelistUser(addr1.address)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(ico.connect(addr1).setUseBlacklist(true)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(ico.connect(addr1).blacklistUser(addr1.address)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(ico.connect(addr1).unblacklistUser(addr1.address)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(ico.connect(addr1).setExcludedFromMaxInvestment(addr1.address, true)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(ico.connect(addr1).setMaxuUSDInvestment(100000)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(ico.connect(addr1).setExcludedFromMaxTransfer(addr1.address, true)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(ico.connect(addr1).setMaxuUSDTransfer(100000)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(ico.connect(addr1).setMinuUSDTransfer(10)).to.be.revertedWith('Ownable: caller is not the owner');

		await expect(ico.connect(addr1).setCrowdsaleStage(1)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(ico.connect(addr1).setHardCapuUSD(300_000_000_000)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(ico.connect(addr1).setSoftCapuUSD(50_000_000_000)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(ico.connect(addr1).setDynamicPrice(true)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(ico.connect(addr1).setPaymentToken("COIN", ico.address, "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", Math.floor(1100*1e6), 18)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(ico.connect(addr1).deletePaymentToken('DOGE', 2)).to.be.revertedWith('Ownable: caller is not the owner');

		await expect(ico.connect(addr1).setTokenAddress(addr1.address)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(ico.connect(addr1).refundAddress("FOO", addr1.address)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(ico.connect(addr1).setTargetWalletAddress(addr1.address)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(ico.connect(addr1).claimAddress(addr1.address)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(ico.connect(addr1).withdraw('USDT', 100)).to.be.revertedWith('Ownable: caller is not the owner');
	});

	it("Should be able to transfer ownership", async() => {

		// before transfer ownership
		await expect(ico.connect(addr1).setMaxuUSDTransfer(100000)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(ico.setMaxuUSDTransfer(100000)).not.to.be.reverted;

		// first transfer ownership step - not taking effect
		await expect(ico.transferOwnership(addr1.address)).not.to.be.reverted;
		await expect(ico.connect(addr1).setMaxuUSDTransfer(100000)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(ico.setMaxuUSDTransfer(100000)).not.to.be.reverted;

		// prevent intruders
		await expect(await ico.pendingOwner()).to.equal(addr1.address);
		await expect(ico.connect(addr2).acceptOwnership()).to.be.revertedWith('Ownable2Step: caller is not the new owner');

		// second transfer ownership step - accept ownership
		await expect(ico.connect(addr1).acceptOwnership()).not.to.be.reverted;
		await expect(ico.setMaxuUSDTransfer(100000)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(ico.connect(addr1).setMaxuUSDTransfer(100000)).not.to.be.reverted;

	});
	
	/********************************************************************************************************/
	/************************************************* Lifecycle ********************************************/
	/********************************************************************************************************/
	it("Should verify Lifecycle.", async() => {
		ico.setCrowdsaleStage(0);
		expect(await ico.getCrowdsaleStage()).to.equal(0, 'The stage couldn\'t be set to NotStarted');

		await ico.setCrowdsaleStage(3);
		expect(await ico.getCrowdsaleStage()).to.equal(3, 'The stage couldn\'t be set');
	});

	/********************************************************************************************************/
	/************************************************ Supplies **********************************************/
	/********************************************************************************************************/
	it("Initialize.", async() => {

		// HardCap
		console.log('HardCap: ' + await ico.getHardCap());
		await ico.setHardCapuUSD(200_000_000_000);
		expect(await ico.getHardCap()).to.equal(200_000);
		await ico.setHardCapuUSD(300_000_000_000);
		expect(await ico.getHardCap()).to.equal(300_000);

		// SoftCap
		console.log('SoftCap: ' + await ico.getSoftCap());
		await ico.setSoftCapuUSD(40_000_000_000);
		expect(await ico.getSoftCap()).to.equal(40_000);
		await ico.setSoftCapuUSD(50_000_000_000);
		expect(await ico.getSoftCap()).to.equal(50_000);

		// get ICO Price
		console.log('price: ' + await ico.getPriceuUSD());
		expect(await ico.getPriceuUSD()).to.equal(BigInt(0.03*10**6));

	});

	/********************************************************************************************************/
	/****************************************** Payment Tokens **********************************************/
	/********************************************************************************************************/
	it("Payment Tokens.", async() => {

		// create payment token
		await ico.setPaymentToken("DOGE", "0x1Cb0DFD5208823F08516E4Aa0CDc4b04F2d6a88c", "0x1Cb0DFD5208823F08516E4Aa0CDc4b04F2d6a88c", 0.074*10**6, 18);
		expect(await ico.getPaymentSymbols()).to.deep.equal([ 'COIN', 'DOGE' ]);
		let DOGE = await ico.getPaymentToken('DOGE');
		expect(DOGE[0]).to.equal('0x1Cb0DFD5208823F08516E4Aa0CDc4b04F2d6a88c');
		expect(DOGE[1]).to.equal('0x1Cb0DFD5208823F08516E4Aa0CDc4b04F2d6a88c');
		expect(DOGE[2]).to.equal(0.074*10**6);
		expect(DOGE[3]).to.equal(18);

		// update payment token
		await ico.setPaymentToken("DOGE", "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", "0x165cd37b4c644c2921454429e7f9358d18a45e14", 0.076*10**6, 19);
		expect(await ico.getPaymentSymbols()).to.deep.equal([ 'COIN', 'DOGE' ]);
		DOGE = await ico.getPaymentToken('DOGE');
		expect(DOGE[0].toLowerCase()).to.equal('0x71C7656EC7ab88b098defB751B7401B5f6d8976F'.toLowerCase());
		expect(DOGE[1].toLowerCase()).to.equal('0x165cd37b4c644c2921454429e7f9358d18a45e14'.toLowerCase());
		expect(DOGE[2]).to.equal(0.076*10**6);
		expect(DOGE[3]).to.equal(19);

		// create multiple payment tokens
		await ico.setPaymentToken("COIN", ico.address, "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", Math.floor(1100*1e6), 18);
		expect(await ico.getPaymentSymbols()).to.deep.equal([ 'COIN', 'DOGE' ]);
		await ico.setPaymentToken("USDT", ico.address, "0x0000000000000000000000000000000000000000", Math.floor(1 * 10**6), 18);
		expect(await ico.getPaymentSymbols()).to.deep.equal([ 'COIN', 'DOGE', 'USDT' ]);
		await ico.setPaymentToken("BNB", ico.address, "0x0000000000000000000000000000000000000000", Math.floor(258.1 * 10**6), 18);
		expect(await ico.getPaymentSymbols()).to.deep.equal([ 'COIN', 'DOGE', 'USDT', 'BNB' ]);
		await ico.setPaymentToken("MATIC", ico.address, "0x0000000000000000000000000000000000000000", Math.floor(0.8 * 10**6), 18);
		expect(await ico.getPaymentSymbols()).to.deep.equal([ 'COIN', 'DOGE', 'USDT', 'BNB', 'MATIC' ]);

		// delete multiple payment tokens
		await expect(ico.deletePaymentToken('DOGE', 2)).to.be.revertedWith(ERRP_INDX_PAY);
		await expect(ico.deletePaymentToken('DOGE', 1)).not.to.be.reverted;
		expect(await ico.getPaymentSymbols()).to.deep.equal([ 'COIN', 'MATIC', 'USDT', 'BNB' ]);
		await expect(ico.deletePaymentToken('BNB', 3)).not.to.be.reverted;
		expect(await ico.getPaymentSymbols()).to.deep.equal([ 'COIN', 'MATIC', 'USDT' ]);
		await expect(ico.deletePaymentToken('MATIC', 1)).not.to.be.reverted;
		expect(await ico.getPaymentSymbols()).to.deep.equal([ 'COIN', 'USDT' ]);
		await expect(ico.deletePaymentToken('USDT', 0)).to.be.revertedWith(ERRP_INDX_PAY);
		await expect(ico.deletePaymentToken('USDT', 1)).not.to.be.reverted;
		expect(await ico.getPaymentSymbols()).to.deep.equal([ 'COIN' ]);

		/*let COIN = await ico.getUusdPerToken('COIN');
		console.log('COIN ' + COIN);
		let USDT = await ico.getUusdPerToken('USDT');
		console.log('USDT ' + USDT);
		let BNB = await ico.getUusdPerToken('BNB');
		console.log('BNB ' + BNB);
		let MATIC = await ico.getUusdPerToken('MATIC');
		console.log('MATIC ' + MATIC);*/
	});

	/********************************************************************************************************/
	/************************************************** Wallets *********************************************/
	/********************************************************************************************************/
	it("Should be able to configure wallets", async() => {
		expect(await ico.getTokenAddress()).to.equal('0x0000000000000000000000000000000000000000', 'Initial token address must be 0');
		await expect(ico.setTokenAddress('0x0000000000000000000000000000000000000000')).to.be.revertedWith('ERRW_INVA_ADD');
		await ico.setTokenAddress(addr1.address);
		expect(await ico.getTokenAddress()).to.equal(addr1.address, 'token address project should have changed to ' + addr1.address);

		expect(await ico.getTargetWalletAddress()).to.equal('0x0000000000000000000000000000000000000000', 'Initial project address must be 0');
		await expect(ico.setTargetWalletAddress('0x0000000000000000000000000000000000000000')).to.be.revertedWith('ERRW_INVA_ADD');
		await ico.setTargetWalletAddress(addr1.address);
		expect(await ico.getTargetWalletAddress()).to.equal(addr1.address, 'target wallet address should have changed to ' + addr1.address);
	});

});
