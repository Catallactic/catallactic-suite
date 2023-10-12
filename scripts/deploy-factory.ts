import { ethers } from "hardhat";
import hre from 'hardhat'
import axios from 'axios';
import * as helpers from "../test/_testhelper";

async function main() {
	await helpers.extractAbi();

	// accounts
	const [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
	console.log('owner - address: %s ; balance: %s', 0, owner.address, await ethers.provider.getBalance(owner.address));
	[owner, addr1, addr2, addr3, ...addrs].forEach(async(account, i) => {
		let balance = await ethers.provider.getBalance(account.address);
		console.log('addr%d - address: %s ; balance: %s', ++i, account.address, balance);
	});

	// network
	const networkName = hre.network.name
	console.log("network:", networkName);

	// ***********************************************************************************************************************************************************
	// ************************************************************************** Install Environment ************************************************************
	// ***********************************************************************************************************************************************************

	// deploy CryptocommoditiesFactory
	const CryptocommoditiesFactory = await ethers.getContractFactory("CryptocommoditiesFactory", owner);
	let cryptocommoditiesFactory = await CryptocommoditiesFactory.deploy();
	await cryptocommoditiesFactory.deployed();
	console.log("CryptocommoditiesFactory:" + cryptocommoditiesFactory.address);

	// ***********************************************************************************************************************************************************
	// ********************************************************* Install Versionable Facets and register in factory **********************************************
	// ***********************************************************************************************************************************************************
	// deploy DiamondCutFacet
	const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet')
	let diamondCutFacet = await DiamondCutFacet.deploy()
	await diamondCutFacet.deployed()
	console.log('DiamondCutFacet deployed:', diamondCutFacet.address)

	// deploy DiamondLoupeFacet *****************************************
	const DiamondLoupeFacet = await ethers.getContractFactory('DiamondLoupeFacet')
	let diamondLoupeFacet = await DiamondLoupeFacet.deploy()
	await diamondLoupeFacet.deployed()
	console.log('DiamondLoupeFacet deployed:', diamondLoupeFacet.address)

	// deploy Common facet
	let CommonFacet = await ethers.getContractFactory("CommonFacet");
	let commonFacet = await CommonFacet.deploy();
	await commonFacet.deployed();
	console.log("CommonFacet deployed:" + commonFacet.address);

	// deploy Crowdsale facet
	let CrowdsaleFacet = await ethers.getContractFactory("CrowdsaleFacet");
	let crowdsaleFacet = await CrowdsaleFacet.deploy();
	await crowdsaleFacet.deployed();
	console.log("CrowdsaleFacet deployed:" + crowdsaleFacet.address);

	// deploy Vesting facet *****************************************
	let VestingFacet = await ethers.getContractFactory("VestingFacet");
	let vestingFacet = await VestingFacet.deploy();
	await vestingFacet.deployed();
	console.log("VestingFacet deployed: " + vestingFacet.address);

	// deploy Token facet *****************************************
	let ERC20Facet = await ethers.getContractFactory("ERC20Facet");
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
	cryptocommoditiesFactory.setFacetVersion('DiamondCutFacet', '1.0', diamondCutFacet.address);
	cryptocommoditiesFactory.setFacetVersion('DiamondLoupeFacet', '1.0', diamondLoupeFacet.address);
	cryptocommoditiesFactory.setFacetVersion('CommonFacet', '1.0', commonFacet.address);
	cryptocommoditiesFactory.setFacetVersion('CrowdsaleFacet', '1.0', crowdsaleFacet.address);
	cryptocommoditiesFactory.setFacetVersion('VestingFacet', '1.0', vestingFacet.address);
	cryptocommoditiesFactory.setFacetVersion('ERC20Facet', '1.0', erc20Facet.address);

	// with factory
	/*cryptocommoditiesFactory.createCryptocommodity(owner.address, 'TEST');
	let diamondAddress = await cryptocommoditiesFactory.getCryptocommodity(owner.address, 'TEST');
	console.log('Diamond Address:', diamondAddress)
	let diamond = await ethers.getContractAt('Diamond', diamondAddress);*/

	// ***********************************************************************************************************************************************************
	// *********************************************************** Configure Cryptocommodity Contract ************************************************************
	// ***********************************************************************************************************************************************************
	// Attach Facets to Cryptocommodity via DiamondCut in UI
	// ***********************************************************************************************************************************************************
	/*const diamondCutContract = await ethers.getContractAt('DiamondCutFacet', diamond.address)

	// attach DiamondLoupeFacet
	const diamondLoupeFacetSelectors = helpers.getSelectors(diamondLoupeFacet);
	let _diamondCut = [{ facetAddress: diamondLoupeFacet.address, action: helpers.FacetCutAction.Add, functionSelectors: diamondLoupeFacetSelectors, }];
	await diamondCutContract.diamondCut(_diamondCut);
	let diamondLoupeContract = await ethers.getContractAt('DiamondLoupeFacet', diamond.address)
	console.log("DiamondLoupeFacet attached as " + diamondCutContract.address);

	// attach Common facet
	const commonFacetSelectors = helpers.getSelectors(commonFacet);
	_diamondCut = [{ facetAddress: commonFacet.address, action: helpers.FacetCutAction.Add, functionSelectors: commonFacetSelectors, }];
	await diamondCutContract.diamondCut(_diamondCut);
	let common = await ethers.getContractAt('CommonFacet', diamond.address)
	console.log("CommonFacet attached as " + common.address);

	// attach Crowdsale facet ex Common
	const crowdsaleFacetExCommonFacetSelectors = helpers.removeSelectors(helpers.getSelectors(crowdsaleFacet), helpers.getSelectors(commonFacet));
	_diamondCut = [{ facetAddress: crowdsaleFacet.address, action: helpers.FacetCutAction.Add, functionSelectors: crowdsaleFacetExCommonFacetSelectors, }];
	await diamondCutContract.diamondCut(_diamondCut);
	let ico = await ethers.getContractAt('CrowdsaleFacet', diamond.address)
	console.log("CrowdsaleFacet attached as " + ico.address);

	// attach Vesting facet ex Common
	const vestingFacetExCommonFacetSelectors = helpers.removeSelectors(helpers.getSelectors(vestingFacet), helpers.getSelectors(commonFacet));
	_diamondCut = [{ facetAddress: vestingFacet.address, action: helpers.FacetCutAction.Add, functionSelectors: vestingFacetExCommonFacetSelectors, }];
	await diamondCutContract.diamondCut(_diamondCut);
	let vesting = await ethers.getContractAt('VestingFacet', diamond.address)
	console.log("VestingFacet attached as " + vesting.address);

	// attach Token facet ex Common
	const erc20FacetExCommonFacetSelectors = helpers.removeSelectors(helpers.getSelectors(erc20Facet), helpers.getSelectors(commonFacet));
	_diamondCut = [{ facetAddress: erc20Facet.address, action: helpers.FacetCutAction.Add, functionSelectors: erc20FacetExCommonFacetSelectors, }];
	await diamondCutContract.diamondCut(_diamondCut);
	let token = await ethers.getContractAt('ERC20Facet', diamond.address)
	console.log("ERC20Facet attached as " + token.address);

	// Initialize Cryptocommodity in UI
	// ***********************************************************************************************************************************************************
	console.log('initializing')
	console.log(await diamondLoupeContract.facetFunctionSelectors(erc20Facet.address));	 // fetching storage is needed before token.initialize. I do not know why				
	common.setStorage(helpers.STORAGE1);
	await token.initialize("CatallacticERC20", "CATA", BigInt(200_000_000 * 10**18));
	await ico.setPaymentToken("COIN", ico.address, "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", Math.floor(1100*1e6), 18);
	console.log('ico.owner()', await ico.owner());
	await ico.setTokenAddress(diamond.address);
	await ico.setVestingAddress(diamond.address);
	await ico.setTargetWalletAddress(diamond.address);
	await vesting.addGrantor(ico.address);
	await diamond.setReceiveFacet(diamond.address);
	console.log('initialized');*/

	// **********************************************************************************************************************************
	// *************************************************** Configure Default prices *****************************************************
	// **********************************************************************************************************************************
	const DEF_PRICE_BTC_IN_USD = 23000;
	const DEF_PRICE_ETH_IN_USD = 1600;
	const DEF_PRICE_MATIC_IN_USD = 1.2;
	const DEF_PRICE_BNB_IN_USD = 300;
	const DEF_PRICE_USDT_IN_USD = 1;

	const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

	// **********************************************************************************************************************************
	// ***************************************************** Configure Localhost Tokens *************************************************
	// **********************************************************************************************************************************
	// https://docs.chain.link/data-feeds/price-feeds/addresses?network=polygon

	if (hre.network.name == 'localhost') {
		console.log("deploying to localhost");

		// ChainLinkAggregator Token
		console.log("ChainLinkAggregator deploying");
		const ChainLinkAggregator = await ethers.getContractFactory("DemoMockAggregator", owner);
		const chainLinkAggregator = await ChainLinkAggregator.deploy();
		await chainLinkAggregator.deployed();
		console.log("ChainLinkAggregator:" + chainLinkAggregator.address);

		// deploy WBTC
		console.log("WBTC deploying");
		const WBTC = await ethers.getContractFactory("FOO");
		const wbtc = await WBTC.deploy("WBTC", "WBTC");
		await wbtc.deployed();
		await wbtc.transfer('0x20caa5fa15c4177cd6946b8041ef40447db27539', ethers.utils.parseUnits("1000000", 18).toString());
		console.log("WBTC deployed to:", wbtc.address);
		console.log("WBTC owner balance: " + await wbtc.balanceOf(owner.address));
		console.log("WBTC 0x20caa5fa15c4177cd6946b8041ef40447db27539 balance: " + await wbtc.balanceOf('0x20caa5fa15c4177cd6946b8041ef40447db27539'));

		// deploy COIN
		console.log("COIN deploying");
		console.log("COIN installed");
		await owner.sendTransaction({
			to: '0x20caa5fa15c4177cd6946b8041ef40447db27539',
			value: ethers.utils.parseUnits('4000', 18),
			gasPrice: '0x5b9aca00',
			gasLimit: '0x56f90',
		});

		// deploy MATIC
		console.log("MATIC deploying");
		const MATIC = await ethers.getContractFactory("FOO");
		const matic = await MATIC.deploy("MATIC", "MATIC");
		await matic.deployed();
		await matic.transfer('0x20caa5fa15c4177cd6946b8041ef40447db27539', ethers.utils.parseUnits("1000000", 18).toString());
		console.log("MATIC deployed to:", matic.address);
		console.log("MATIC owner balance: " + await matic.balanceOf(owner.address));
		console.log("MATIC 0x20caa5fa15c4177cd6946b8041ef40447db27539 balance: " + await matic.balanceOf('0x20caa5fa15c4177cd6946b8041ef40447db27539'));

		// deploy BNB
		console.log("BNB deploying");
		const BNB = await ethers.getContractFactory("FOO");
		const bnb = await BNB.deploy("BNB", "BNB");
		await bnb.deployed();
		await bnb.transfer('0x20caa5fa15c4177cd6946b8041ef40447db27539', ethers.utils.parseUnits("1000000", 18).toString());
		console.log("BNB deployed to:", bnb.address);
		console.log("BNB owner balance: " + await bnb.balanceOf(owner.address));
		console.log("BNB 0x20caa5fa15c4177cd6946b8041ef40447db27539 balance: " + await bnb.balanceOf('0x20caa5fa15c4177cd6946b8041ef40447db27539'));

		// deploy USDT
		console.log("USDT deploying");
		const USDT = await ethers.getContractFactory("FOO");
		const usdt = await USDT.deploy("USDT", "USDT");
		await usdt.deployed();
		await usdt.transfer('0x20caa5fa15c4177cd6946b8041ef40447db27539', ethers.utils.parseUnits("1000000", 18).toString());
		console.log("USDT deployed to:", usdt.address);
		console.log("USDT owner balance: " + await usdt.balanceOf(owner.address));
		console.log("USDT 0x20caa5fa15c4177cd6946b8041ef40447db27539 balance: " + await usdt.balanceOf('0x20caa5fa15c4177cd6946b8041ef40447db27539'));

		// add Payment Tokens
		await cryptocommoditiesFactory.setPaymentToken("WBTC", wbtc.address, ZERO_ADDRESS, Math.floor(DEF_PRICE_BTC_IN_USD * 10**6), 18);
		await cryptocommoditiesFactory.setPaymentToken("COIN", cryptocommoditiesFactory.address, ZERO_ADDRESS, Math.floor(DEF_PRICE_ETH_IN_USD * 10**6), 18);
		await cryptocommoditiesFactory.setPaymentToken("MATIC", matic.address, ZERO_ADDRESS, Math.floor(DEF_PRICE_MATIC_IN_USD * 10**6), 18);
		await cryptocommoditiesFactory.setPaymentToken("BNB", bnb.address, ZERO_ADDRESS, Math.floor(DEF_PRICE_BNB_IN_USD * 10**6), 18);
		await cryptocommoditiesFactory.setPaymentToken("USDT", usdt.address, ZERO_ADDRESS, Math.floor(DEF_PRICE_USDT_IN_USD * 10**6), 18);

	}

	// **********************************************************************************************************************************
	// *************************************************** Configure Ethereum Tokens ****************************************************
	// **********************************************************************************************************************************
	if (hre.network.name == 'sepolia') {
		console.log("deploying to sepolia");

		// ChainLinkAggregator Token
		console.log("ChainLinkAggregator deploying");
		const ChainLinkAggregator = await ethers.getContractFactory("DemoMockAggregator", owner);
		const chainLinkAggregator = await ChainLinkAggregator.deploy();
		await chainLinkAggregator.deployed();
		console.log("ChainLinkAggregator:" + chainLinkAggregator.address);

		// deploy WBTC
		console.log("WBTC deploying");
		const WBTC = await ethers.getContractFactory("FOO");
		const wbtc = await WBTC.deploy("WBTC", "WBTC");
		await wbtc.deployed();
		await wbtc.transfer('0x20caa5fa15c4177cd6946b8041ef40447db27539', ethers.utils.parseUnits("1000000", 18).toString());
		console.log("WBTC deployed to:", wbtc.address);
		console.log("WBTC owner balance: " + await wbtc.balanceOf(owner.address));
		console.log("WBTC 0x20caa5fa15c4177cd6946b8041ef40447db27539 balance: " + await wbtc.balanceOf('0x20caa5fa15c4177cd6946b8041ef40447db27539'));

		// deploy ETH
		console.log("COIN deploying");
		console.log("COIN installed");

		// deploy MATIC
		console.log("MATIC deploying");
		const MATIC = await ethers.getContractFactory("FOO");
		const matic = await MATIC.deploy("MATIC", "MATIC");
		await matic.deployed();
		await matic.transfer('0x20caa5fa15c4177cd6946b8041ef40447db27539', ethers.utils.parseUnits("1000000", 18).toString());
		console.log("MATIC deployed to:", matic.address);
		console.log("MATIC owner balance: " + await matic.balanceOf(owner.address));
		console.log("MATIC 0x20caa5fa15c4177cd6946b8041ef40447db27539 balance: " + await matic.balanceOf('0x20caa5fa15c4177cd6946b8041ef40447db27539'));

		// deploy BNB
		console.log("BNB deploying");
		const BNB = await ethers.getContractFactory("FOO");
		const bnb = await BNB.deploy("BNB", "BNB");
		await bnb.deployed();
		await bnb.transfer('0x20caa5fa15c4177cd6946b8041ef40447db27539', ethers.utils.parseUnits("1000000", 18).toString());
		console.log("BNB deployed to:", bnb.address);
		console.log("BNB owner balance: " + await bnb.balanceOf(owner.address));
		console.log("BNB 0x20caa5fa15c4177cd6946b8041ef40447db27539 balance: " + await bnb.balanceOf('0x20caa5fa15c4177cd6946b8041ef40447db27539'));

		// deploy USDT
		console.log("USDT deploying");
		const USDT = await ethers.getContractFactory("FOO");
		const usdt = await USDT.deploy("USDT", "USDT");
		await usdt.deployed();
		await usdt.transfer('0x20caa5fa15c4177cd6946b8041ef40447db27539', ethers.utils.parseUnits("1000000", 18).toString());
		console.log("USDT deployed to:", usdt.address);
		console.log("USDT owner balance: " + await usdt.balanceOf(owner.address));
		console.log("USDT 0x20caa5fa15c4177cd6946b8041ef40447db27539 balance: " + await usdt.balanceOf('0x20caa5fa15c4177cd6946b8041ef40447db27539'));

		// add Payment Tokens
		await cryptocommoditiesFactory.setPaymentToken("WBTC", wbtc.address, "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43", Math.floor(DEF_PRICE_BTC_IN_USD * 10**6), 18);
		await cryptocommoditiesFactory.setPaymentToken("COIN", cryptocommoditiesFactory.address, "0x694AA1769357215DE4FAC081bf1f309aDC325306", Math.floor(DEF_PRICE_ETH_IN_USD * 10**6), 18);
		await cryptocommoditiesFactory.setPaymentToken("MATIC", matic.address, ZERO_ADDRESS, Math.floor(DEF_PRICE_MATIC_IN_USD * 10**6), 18);
		await cryptocommoditiesFactory.setPaymentToken("BNB", bnb.address, ZERO_ADDRESS, Math.floor(DEF_PRICE_BNB_IN_USD * 10**6), 18);
		await cryptocommoditiesFactory.setPaymentToken("USDT", usdt.address, ZERO_ADDRESS, Math.floor(DEF_PRICE_USDT_IN_USD * 10**6), 18);

	}

	if (hre.network.name == 'ethereum') {
		console.log("deploying to ethereum");

		// add Payment Tokens
		await cryptocommoditiesFactory.setPaymentToken("WBTC", '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c', Math.floor(DEF_PRICE_BTC_IN_USD * 10**6), 18);				
		await cryptocommoditiesFactory.setPaymentToken("COIN", cryptocommoditiesFactory.address, "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", Math.floor(DEF_PRICE_ETH_IN_USD * 10**6), 18);
		await cryptocommoditiesFactory.setPaymentToken("MATIC", '0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa', "0x7bAC85A8a13A4BcD8abb3eB7d6b4d632c5a57676", Math.floor(DEF_PRICE_MATIC_IN_USD * 10**6), 18);
		// https://etherscan.io/token/0xB8c77482e45F1F44dE1745F52C74426C631bDD52
		await cryptocommoditiesFactory.setPaymentToken("BNB", '0xB8c77482e45F1F44dE1745F52C74426C631bDD52', '0x14e613AC84a31f709eadbdF89C6CC390fDc9540A', Math.floor(DEF_PRICE_BNB_IN_USD * 10**6), 18);
		await cryptocommoditiesFactory.setPaymentToken("USDT", '', '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D', Math.floor(DEF_PRICE_USDT_IN_USD * 10**6), 18);

	}

	// **********************************************************************************************************************************
	// *************************************************** Configure Polygon Tokens *****************************************************
	// **********************************************************************************************************************************
	if (hre.network.name == 'polygon_mumbai') {
		console.log("deploying to polygon_mumbai");

		// ChainLinkAggregator Token
		console.log("ChainLinkAggregator deploying");
		const ChainLinkAggregator = await ethers.getContractFactory("DemoMockAggregator", owner);
		const chainLinkAggregator = await ChainLinkAggregator.deploy();
		await chainLinkAggregator.deployed();
		await chainLinkAggregator.setDynamicPrice(300);
		console.log("ChainLinkAggregator:" + chainLinkAggregator.address);

		// deploy WBTC
		// https://mumbai.polygonscan.com/address/0x0d787a4a1548f673ed375445535a6c7a1ee56180
		// https://github.com/swaponline/MultiCurrencyWallet/blob/master/docs/FAUCETS.md
		await cryptocommoditiesFactory.setPaymentToken("WBTC", '0x0d787a4a1548f673ed375445535a6c7A1EE56180', '0x007A22900a3B98143368Bd5906f8E17e9867581b', Math.floor(DEF_PRICE_BTC_IN_USD * 10**6), 8);
		console.log("WBTC installed");
1
		// deploy ETH
		// https://mumbai.polygonscan.com/token/0xa6fa4fb5f76172d178d61b04b0ecd319c5d1c0aa
		// https://staging.aave.com/#/faucet
		// https://faucet.paradigm.xyz/
		await cryptocommoditiesFactory.setPaymentToken("WETH", '0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa', "0x0715A7794a1dc8e42615F059dD6e406A6594651A", Math.floor(DEF_PRICE_ETH_IN_USD * 10**6), 18);
		console.log("WETH installed");

		// deploy MATIC
		// https://faucet.polygon.technology/
		await cryptocommoditiesFactory.setPaymentToken("COIN", cryptocommoditiesFactory.address, "0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada", Math.floor(DEF_PRICE_MATIC_IN_USD * 10**6), 18);
		console.log("COIN installed");

		// deploy BNB
		console.log("BNB deploying");
		const BNB = await ethers.getContractFactory("FOO");
		const bnb = await BNB.deploy("BNB", "BNB");
		await bnb.deployed();
		await cryptocommoditiesFactory.setPaymentToken("BNB", bnb.address, chainLinkAggregator.address, Math.floor(DEF_PRICE_BNB_IN_USD * 10**6), 18);
		await bnb.transfer('0x20caa5fa15c4177cd6946b8041ef40447db27539', ethers.utils.parseUnits("1000000", 18).toString());
		console.log("BNB deployed to:", bnb.address);
		console.log("BNB owner balance: " + await bnb.balanceOf(owner.address));
		console.log("BNB 0x20caa5fa15c4177cd6946b8041ef40447db27539 balance: " + await bnb.balanceOf('0x20caa5fa15c4177cd6946b8041ef40447db27539'));
		console.log("BNB installed");

		// deploy USDT
		// https://mumbai.polygonscan.com/address/0xa02f6adc7926efebbd59fd43a84f4e0c0c91e832
		// https://calibration-faucet.filswan.com/#/dashboard
		await cryptocommoditiesFactory.setPaymentToken("USDT", '0xa02f6adc7926efebbd59fd43a84f4e0c0c91e832', '0x92C09849638959196E976289418e5973CC96d645', Math.floor(DEF_PRICE_USDT_IN_USD * 10**6), 6);
		console.log("USDT installed");

	}

	if (hre.network.name == 'polygon') {
		console.log("deploying to polygon");

		// checks for gas because ethersjs has gas hardcoded and this gives transaction underpriced error
		// https://github.com/ethers-io/ethers.js/issues/2828
		// https://github.com/ethers-io/ethers.js/issues/3370
		const gasEstimated = await cryptocommoditiesFactory.estimateGas.setPaymentToken("FOOBAR", '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6', '0xDE31F8bFBD8c84b5360CFACCa3539B938dd78ae6', Math.floor(DEF_PRICE_BTC_IN_USD * 10**6), 18);
		console.log("gasEstimated:", gasEstimated);
		const GAS = await calcGas(gasEstimated);
		//console.log("gas:", GAS);

		// deploy WBTC
		// https://polygonscan.com/token/0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6
		console.log("WBTC installed");

		// deploy ETH
		// https://polygonscan.com/token/0x7ceb23fd6bc0add59e62ac25578270cff1b9f619

		console.log("WETH installed");

		// deploy MATIC

		console.log("COIN installed");

		// deploy BNB
		// https://polygonscan.com/token/0x3BA4c387f786bFEE076A58914F5Bd38d668B42c3

		console.log("BNB installed");

		// deploy USDT
		// https://polygonscan.com/token/0xc2132d05d31c914a87c6611c10748aeb04b58e8f

		console.log("USDT installed");

		// add Payment Tokens
		const tx1 = await cryptocommoditiesFactory.setPaymentToken("WBTC", '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6', '0xDE31F8bFBD8c84b5360CFACCa3539B938dd78ae6', Math.floor(DEF_PRICE_BTC_IN_USD * 10**6), 18, GAS);
		await tx1.wait();
		const tx2 = await cryptocommoditiesFactory.setPaymentToken("WETH", '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', "0xF9680D99D6C9589e2a93a78A04A279e509205945", Math.floor(DEF_PRICE_ETH_IN_USD * 10**6), 18, GAS);
		await tx2.wait();
		const tx3 = await cryptocommoditiesFactory.setPaymentToken("COIN", cryptocommoditiesFactory.address, "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0", Math.floor(DEF_PRICE_MATIC_IN_USD * 10**6), 18, GAS);
		await tx3.wait();
		const tx4 = await cryptocommoditiesFactory.setPaymentToken("BNB", '0x3BA4c387f786bFEE076A58914F5Bd38d668B42c3', '0x82a6c4AF830caa6c97bb504425f6A66165C2c26e', Math.floor(DEF_PRICE_BNB_IN_USD * 10**6), 18, GAS);
		await tx4.wait();
		const tx5 = await cryptocommoditiesFactory.setPaymentToken("USDT", '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', '0x0A6513e40db6EB1b165753AD52E80663aeA50545', Math.floor(DEF_PRICE_USDT_IN_USD * 10**6), 18, GAS);
		await tx5.wait();

	}

	// **********************************************************************************************************************************
	// ***************************************************** Configure BSC Tokens *******************************************************
	// **********************************************************************************************************************************
	if (hre.network.name == 'bsc') {

		// deploy WBTC
		// N/A

		// deploy ETH

		// deploy MATIC

		// deploy BNB

		// deploy USDT

	}

	if (hre.network.name == 'bsc_testnet') {

		// ChainLinkAggregator Token
		console.log("ChainLinkAggregator deploying");
		const ChainLinkAggregator = await ethers.getContractFactory("DemoMockAggregator", owner);
		const chainLinkAggregator = await ChainLinkAggregator.deploy();
		await chainLinkAggregator.deployed();
		console.log("ChainLinkAggregator:" + chainLinkAggregator.address);

		// deploy WBTC
		// N/A

		// deploy ETH

		// deploy MATIC

		// deploy BNB

		// deploy USDT

	}

	// **********************************************************************************************************************************
	// ************************************************ Configure Optimism Tokens *******************************************************
	// **********************************************************************************************************************************
	if (hre.network.name == 'optimism') {

		// deploy WBTC
		// N/A

		// deploy ETH

		// deploy MATIC

		// deploy BNB

		// deploy USDT

	}

	if (hre.network.name == 'optimism_goerly') {

		// ChainLinkAggregator Token
		console.log("ChainLinkAggregator deploying");
		const ChainLinkAggregator = await ethers.getContractFactory("DemoMockAggregator", owner);
		const chainLinkAggregator = await ChainLinkAggregator.deploy();
		await chainLinkAggregator.deployed();
		console.log("ChainLinkAggregator:" + chainLinkAggregator.address);

		// deploy WBTC
		// N/A

		// deploy ETH

		// deploy MATIC

		// deploy BNB

		// deploy USDT

	}

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});


// ****************************************************************************
// ***************************** Helper Functions *****************************
// ****************************************************************************
const sleep = (ms:any) => new Promise(r => setTimeout(r, ms));

function parse(data: number) {
	return ethers.utils.parseUnits(Math.ceil(data) + '', 'gwei');
}

async function calcGas(gasEstimated: any) {
	let gas = {
			gasLimit: gasEstimated, //.mul(110).div(100)
			maxFeePerGas: ethers.BigNumber.from(40000000000),
			maxPriorityFeePerGas: ethers.BigNumber.from(40000000000)
	};
	try {
			const {data} = await axios({
					method: 'get',
					url: 'https://gasstation-mainnet.matic.network/v2'
			});
			gas.maxFeePerGas = parse(data.fast.maxFee);
			gas.maxPriorityFeePerGas = parse(data.fast.maxPriorityFee);
	} catch (error) {

	}
	return gas;
};