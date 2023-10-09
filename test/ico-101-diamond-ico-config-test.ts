import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import * as helpers from "./_testhelper";

// describe.skip
describe("ico-101-diamond-ico-config-test", function () {
	const hre = require("hardhat");

	let owner: SignerWithAddress, project: SignerWithAddress, liquidity: SignerWithAddress;
	let addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addrs;
	let common: Contract, ico: Contract, token: Contract;

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
		//console.log('attachig functions:', crowdsaleFacetExCommonFacetSelectors)
		_diamondCut = [{ facetAddress: crowdsaleFacet.address, action: helpers.FacetCutAction.Add, functionSelectors: crowdsaleFacetExCommonFacetSelectors, }];
		await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;
		console.log("CrowdsaleFacet attached as " + ico.address);

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
		console.log('initializing');
		await expect(common.setStorage()).not.to.be.reverted;
		await expect(await common.owner()).to.equal('0x0000000000000000000000000000000000000000');
		await expect(ico.createCrowdsale(30_000, 300_000_000_000, 50_000_000_000, 1_000_000_000, 100_000_000_000, 100_000_000_000, 9_999_999, 90, 'abc')).not.to.be.reverted;
		await expect(ico.setPaymentToken("COIN", ico.address, "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", Math.floor(1100*1e6), 18)).not.to.be.reverted;
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
		console.log("\tproject address: " + project.address);
		console.log("\tliquidity address: " + liquidity.address);
		console.log("\n");

	});

	it("Verify Initialization.", async() => {
		await expect(await common.owner()).to.equal(owner.address);
		await expect(await ico.getHardCap()).to.equal(300_000);
		await expect(await ico.getSoftCap()).to.equal(50_000);
		await expect(await ico.getWhitelistuUSDThreshold()).to.equal(1_000_000_000);
		await expect(await ico.getMaxUSDInvestment()).to.equal(100_000);
		await expect(await ico.getMaxUSDTransfer()).to.equal(100_000);
		await expect(await ico.getMinUSDTransfer()).to.equal(9);
	});

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

		await expect(ico.connect(addr1).setCrowdsaleStage(helpers.STAGE.ONGOING)).to.be.revertedWith('Ownable: caller is not the owner');
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
		ico.setCrowdsaleStage(helpers.STAGE.NOT_STARTED);
		expect(await ico.getCrowdsaleStage()).to.equal(helpers.STAGE.NOT_STARTED, 'The stage couldn\'t be set to NotStarted');

		await ico.setCrowdsaleStage(helpers.STAGE.FINISHED);
		expect(await ico.getCrowdsaleStage()).to.equal(helpers.STAGE.FINISHED, 'The stage couldn\'t be set');
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
		console.log('price2: ' + await ico.getPriceuUSD());

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
		await expect(ico.deletePaymentToken('DOGE', 2)).to.be.revertedWith(helpers.ERRORS.ERRP_INDX_PAY);
		await expect(ico.deletePaymentToken('DOGE', 1)).not.to.be.reverted;
		expect(await ico.getPaymentSymbols()).to.deep.equal([ 'COIN', 'MATIC', 'USDT', 'BNB' ]);
		await expect(ico.deletePaymentToken('BNB', 3)).not.to.be.reverted;
		expect(await ico.getPaymentSymbols()).to.deep.equal([ 'COIN', 'MATIC', 'USDT' ]);
		await expect(ico.deletePaymentToken('MATIC', 1)).not.to.be.reverted;
		expect(await ico.getPaymentSymbols()).to.deep.equal([ 'COIN', 'USDT' ]);
		await expect(ico.deletePaymentToken('USDT', 0)).to.be.revertedWith(helpers.ERRORS.ERRP_INDX_PAY);
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
		await expect(ico.setTokenAddress('0x0000000000000000000000000000000000000000')).to.be.revertedWith(helpers.ERRORS.ERRW_INVA_ADD);
		await ico.setTokenAddress(addr1.address);
		expect(await ico.getTokenAddress()).to.equal(addr1.address, 'token address project should have changed to ' + addr1.address);

		expect(await ico.getTargetWalletAddress()).to.equal('0x0000000000000000000000000000000000000000', 'Initial project address must be 0');
		await expect(ico.setTargetWalletAddress('0x0000000000000000000000000000000000000000')).to.be.revertedWith(helpers.ERRORS.ERRW_INVA_ADD);
		await ico.setTargetWalletAddress(addr1.address);
		expect(await ico.getTargetWalletAddress()).to.equal(addr1.address, 'target wallet address should have changed to ' + addr1.address);
	});

});
