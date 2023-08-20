import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("ico-13-diamond-coin-ico2token-test", function () {
	const hre = require("hardhat");

	let CrowdsaleFacet, ico: Contract;
	let ERC20Facet, token: Contract;
	let CommonFacet, common: Contract;
	let ChainLinkAggregator, chainLinkAggregator: Contract;
	let owner: SignerWithAddress, project: SignerWithAddress, liquidity: SignerWithAddress;
	let addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addrs;

  let diamondCutContract: Contract, diamondLoupeContract: Contract;

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
	let ERRR_VEST_100: string = 'ERRR_VEST_100' // Vesting percentag must be smaller than 100

	/********************************************************************************************************/
	/********************************************** deployment utils ****************************************/
	/********************************************************************************************************/
	const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 }

	let getSelectors = function (contract:Contract) {
    const signatures: string[] = Object.keys(contract.interface.functions);
    return signatures.reduce((acc: string[], val) => {
        if (val !== 'init(bytes)') {
            acc.push(contract.interface.getSighash(val));
        }
        return acc;
    }, []);
	}
	let removeSelectors = function (selectors: string[], removeSelectors: string[]) {
		selectors = selectors.filter(v => !removeSelectors.includes(v))
		return selectors
	}
	let logSelectors = function (contract:Contract) {
    const signatures: string[] = Object.keys(contract.interface.functions);
    return signatures.reduce((acc: string[], val) => {
			console.log(val + '->' + contract.interface.getSighash(val));
      return acc;
    }, []);
	}

	/********************************************************************************************************/
	/************************************************** hooks ***********************************************/
	/********************************************************************************************************/
	before(async() => {
		console.log('-------- Starting Tests -------');
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
		ChainLinkAggregator = await ethers.getContractFactory("DemoMockAggregator", owner);
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
		diamondCutContract = await ethers.getContractAt('DiamondCutFacet', diamond.address)

		// deploy DiamondLoupeFacet
		const DiamondLoupeFacet = await ethers.getContractFactory('DiamondLoupeFacet')
		let diamondLoupeFacet = await DiamondLoupeFacet.deploy()
		await diamondLoupeFacet.deployed()
    diamondLoupeContract = await ethers.getContractAt('DiamondLoupeFacet', diamond.address)
		console.log('DiamondLoupeFacet deployed:', diamondLoupeFacet.address)

		// attach DiamondLoupeFacet
		let _diamondCut = [{ facetAddress: diamondLoupeFacet.address, action: FacetCutAction.Add, functionSelectors: getSelectors(diamondLoupeFacet), }];
		await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;
		console.log("DiamondLoupeFacet attached as " + diamondCutContract.address);

		// deploy Common facet
		CommonFacet = await ethers.getContractFactory("CommonFacet");
		let commonFacet = await CommonFacet.deploy();
		await commonFacet.deployed();
		common = await ethers.getContractAt('CommonFacet', diamond.address)
		console.log("CommonFacet deployed:" + commonFacet.address);

		// attach Common facet
		//console.log('attachig functions:', getSelectors(commonFacet))
		_diamondCut = [{ facetAddress: commonFacet.address, action: FacetCutAction.Add, functionSelectors: getSelectors(commonFacet), }];
		await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;
		console.log("CommonFacet attached as " + common.address);

		// deploy Crowdsale facet
		CrowdsaleFacet = await ethers.getContractFactory("CrowdsaleFacet");
		let crowdsaleFacet = await CrowdsaleFacet.deploy();
		await crowdsaleFacet.deployed();
		ico = await ethers.getContractAt('CrowdsaleFacet', diamond.address)
		console.log("CrowdsaleFacet deployed:" + crowdsaleFacet.address);

		// attach Crowdsale facet ex Common
		const crowdsaleFacetExCommonFacetSelectors = removeSelectors(getSelectors(crowdsaleFacet),getSelectors(commonFacet));
		//crowdsaleFacetExCommonFacetSelectors.push(commonFacet.interface.getSighash('receive()'))
		//console.log('attachig functions:', crowdsaleFacetExCommonFacetSelectors)
		_diamondCut = [{ facetAddress: crowdsaleFacet.address, action: FacetCutAction.Add, functionSelectors: crowdsaleFacetExCommonFacetSelectors, }];
		await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;
		console.log("CrowdsaleFacet attached as " + ico.address);

		// deploy Token facet
		ERC20Facet = await ethers.getContractFactory("ERC20Facet");
		let erc20Facet = await ERC20Facet.deploy();
		await erc20Facet.deployed();
    token = await ethers.getContractAt('ERC20Facet', diamond.address)
		console.log("ERC20Facet deployed:" + erc20Facet.address);

		// attach Token facet ex Common
		const erc20FacetExCommonFacetSelectors = removeSelectors(getSelectors(erc20Facet),getSelectors(commonFacet));
		//console.log('attachig functions:', erc20FacetExCommonFacetSelectors)
		_diamondCut = [{ facetAddress: erc20Facet.address, action: FacetCutAction.Add, functionSelectors: erc20FacetExCommonFacetSelectors, }];
		await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;
		console.log("ERC20Facet attached as " + token.address);

		// initialize
		console.log('initializing')
		await expect(await common.owner()).to.equal('0x0000000000000000000000000000000000000000');
		await expect(ico.createCrowdsale(30_000, 300_000_000_000, 50_000_000_000, 1_000_000_000, 100_000_000_000, 100_000_000_000, 9_999_999, 0, '')).not.to.be.reverted;
		await expect(ico.setPaymentToken("COIN", ico.address, chainLinkAggregator.address, Math.floor(1100*1e6), 18)).not.to.be.reverted;
		await expect(token.initialize()).not.to.be.reverted;
		await expect(diamond.setReceiveFacet(crowdsaleFacet.address)).to.not.be.reverted;
		await expect(await common.owner()).to.equal(owner.address);
		console.log('initialized')

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
		return ethers.utils.parseUnits((usdToEther(usd).toString()), 18);
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

	it("Should do number conversions.", async() => {

		console.log("usd to wei to usd: " + weiToUsd(usdToWei(10)));
		console.log("usd to eher to usd: " + etherToUsd(usdToEther(10)));

	});

	// transfer helper
	let testTransferCoin = async (addr: SignerWithAddress, usdAmount: number) => {
		console.log("purchase of : " + usdAmount + " USD = " + usdToWei(usdAmount) + " Wei by " + addr.address);
		return await addr.sendTransaction({
			to: ico.address,
			value: usdToWei(usdAmount),
			gasPrice: '0x5b9aca00',
			gasLimit: '0x56f90',
		});
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
		it("Should be able to Claim Coins", async() => {

		// prepare test
		await ico.setCrowdsaleStage(1);

		await ico.setMaxuUSDTransfer(20_000_000 * 10**6);
		await ico.setMaxuUSDInvestment(140_000_000 * 10**6);
		await ico.setWhitelistuUSDThreshold(20_000_000 * 10**6);

		await ico.setTokenAddress(token.address);

		await expect(testTransferCoin(addr1, 19000)).not.to.be.reverted;
		await expect(testTransferCoin(addr2, 19000)).not.to.be.reverted;
		await expect(testTransferCoin(addr3, 19000)).not.to.be.reverted;

		await ico.setCrowdsaleStage(3);

		let price: number = await ico.getPriceuUSD();
		console.log("price " + price);

		// claim tokens from investors 1
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(19000 * 10**6);
		let uUSDContributed1 = await ico.getuUSDToClaim(addr1.address);
		console.log("uUSDContributed1 " + uUSDContributed1);
		let numTokensWithDecimals1 = BigInt(uUSDContributed1) * BigInt(10**18) / BigInt(price);
		expect(token.transfer(ico.address, numTokensWithDecimals1)).not.to.be.reverted;
		await expect(() => ico.connect(addr1).claim())
			.to.changeTokenBalances(token, [ico, addr1], [BigInt(-1) * numTokensWithDecimals1, numTokensWithDecimals1]);
			expect(await ico.getuUSDToClaim(addr1.address)).to.equal(0);
		expect(await ico.getContribution(addr1.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr1.address, 'COIN')).to.equal(0);

		// claim tokens from investors 2
		let uUSDContributed2 = await ico.getuUSDToClaim(addr2.address);
		let numTokensWithDecimals2 = BigInt(uUSDContributed2) * BigInt(10**18) / BigInt(price);
		expect(token.transfer(ico.address, numTokensWithDecimals2)).not.to.be.reverted;
		await expect(() => ico.connect(addr2).claim())
			.to.changeTokenBalances(token, [ico, addr2], [BigInt(-1) * numTokensWithDecimals2, numTokensWithDecimals2]);
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(0);
		expect(await ico.getContribution(addr2.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr2.address, 'COIN')).to.equal(0);

		// claim tokens from investors 3
		let uUSDContributed3 = await ico.getuUSDToClaim(addr3.address);
		let numTokensWithDecimals3 = BigInt(uUSDContributed3) * BigInt(10**18) / BigInt(price);
		expect(token.transfer(ico.address, numTokensWithDecimals3)).not.to.be.reverted;
		await expect(() => ico.connect(addr3).claim())
			.to.changeTokenBalances(token, [ico, addr3], [BigInt(-1) * numTokensWithDecimals3, numTokensWithDecimals3]);
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(0);
		expect(await ico.getContribution(addr3.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr3.address, 'COIN')).to.equal(0);

	});

	it("Should be able to Claim Coins by admin", async() => {

		// prepare test
		await ico.setCrowdsaleStage(1);

		await ico.setMaxuUSDTransfer(20_000_000 * 10**6);
		await ico.setMaxuUSDInvestment(140_000_000 * 10**6);
		await ico.setWhitelistuUSDThreshold(20_000_000 * 10**6);

		await ico.setTokenAddress(token.address);

		await expect(testTransferCoin(addr1, 19000)).not.to.be.reverted;
		await expect(testTransferCoin(addr2, 19000)).not.to.be.reverted;
		await expect(testTransferCoin(addr3, 19000)).not.to.be.reverted;

		await ico.setCrowdsaleStage(3);

		let price: number = await ico.getPriceuUSD();
		console.log("price " + price);

		// claim tokens from investors 1
		let uUSDContributed1 = await ico.getuUSDToClaim(addr1.address);
		console.log("uUSDContributed1 " + uUSDContributed1);
		let numTokensWithDecimals1 = BigInt(uUSDContributed1) * BigInt(10**18) / BigInt(price);
		expect(token.transfer(ico.address, numTokensWithDecimals1)).not.to.be.reverted;
		await expect(() => ico.claimAddress(addr1.address))
			.to.changeTokenBalances(token, [ico, addr1], [BigInt(-1) * numTokensWithDecimals1, numTokensWithDecimals1]);
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(0);
		expect(await ico.getContribution(addr1.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr1.address, 'COIN')).to.equal(0);

		// claim tokens from investors 2
		let uUSDContributed2 = await ico.getuUSDToClaim(addr2.address);
		let numTokensWithDecimals2 = BigInt(uUSDContributed2) * BigInt(10**18) / BigInt(price);
		expect(token.transfer(ico.address, numTokensWithDecimals2)).not.to.be.reverted;
		await expect(() => ico.claimAddress(addr2.address))
			.to.changeTokenBalances(token, [ico, addr2], [BigInt(-1) * numTokensWithDecimals2, numTokensWithDecimals2]);
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(0);
		expect(await ico.getContribution(addr2.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr2.address, 'COIN')).to.equal(0);

		// claim tokens from investors 3
		let uUSDContributed3 = await ico.getuUSDToClaim(addr3.address);
		let numTokensWithDecimals3 = BigInt(uUSDContributed3) * BigInt(10**18) / BigInt(price);
		expect(token.transfer(ico.address, numTokensWithDecimals3)).not.to.be.reverted;
		await expect(() => ico.claimAddress(addr3.address))
			.to.changeTokenBalances(token, [ico, addr3], [BigInt(-1) * numTokensWithDecimals3, numTokensWithDecimals3]);
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(0);
		expect(await ico.getContribution(addr3.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr3.address, 'COIN')).to.equal(0);

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

		await expect(testTransferCoin(addr1, 19000)).not.to.be.reverted;
		await expect(testTransferCoin(addr2, 19000)).not.to.be.reverted;
		await expect(testTransferCoin(addr3, 19000)).not.to.be.reverted;

		await ico.setCrowdsaleStage(3);

		// claim
		let price: number = await ico.getPriceuUSD();
		console.log("price " + price);

		// claim tokens from investors 1
		let uUSDContributed1 = await ico.getuUSDToClaim(addr1.address);
		console.log("uUSDContributed1 " + uUSDContributed1);
		let numTokensWithDecimals1 = BigInt(uUSDContributed1) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals1);
		await expect(() => ico.claimAddress(addr1.address))
			.to.changeTokenBalances(token, [ico, addr1], [BigInt(-1) * numTokensWithDecimals1, numTokensWithDecimals1]);
		expect(await ico.getuUSDToClaim(addr1.address)).to.equal(0);
		expect(await ico.getContribution(addr1.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr1.address, 'COIN')).to.equal(0);

		// claim tokens from investors 2
		let uUSDContributed2 = await ico.getuUSDToClaim(addr2.address);
		let numTokensWithDecimals2 = BigInt(uUSDContributed2) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals2);
		await expect(() => ico.claimAddress(addr2.address))
			.to.changeTokenBalances(token, [ico, addr2], [BigInt(-1) * numTokensWithDecimals2, numTokensWithDecimals2]);
		expect(await ico.getuUSDToClaim(addr2.address)).to.equal(0);
		expect(await ico.getContribution(addr2.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr2.address, 'COIN')).to.equal(0);

		// claim tokens from investors 3
		let uUSDContributed3 = await ico.getuUSDToClaim(addr3.address);
		let numTokensWithDecimals3 = BigInt(uUSDContributed3) * BigInt(10**18) / BigInt(price);
		token.transfer(ico.address, numTokensWithDecimals3);
		await expect(() => ico.claimAddress(addr3.address))
			.to.changeTokenBalances(token, [ico, addr3], [BigInt(-1) * numTokensWithDecimals3, numTokensWithDecimals3]);
		expect(await ico.getuUSDToClaim(addr3.address)).to.equal(0);
		expect(await ico.getContribution(addr3.address, 'COIN')).to.equal(0);
		expect(await ico.getuUSDContribution(addr3.address, 'COIN')).to.equal(0);

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
		expect(await ico.getPercentVested()).to.equal(0);
		expect(await ico.getVestingId()).to.equal('0x0000000000000000000000000000000000000000000000000000000000000000');
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
		expect(await ico.getVestingId()).to.equal('0x0000000000000000000000000000000000000000000000000000000000000000');
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

		await expect(testTransferCoin(addr1, 19000)).not.to.be.reverted;
		await expect(testTransferCoin(addr2, 19000)).not.to.be.reverted;
		await expect(testTransferCoin(addr3, 19000)).not.to.be.reverted;
		
		await ico.setCrowdsaleStage(3);

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
