import { ethers } from "hardhat";
import hre from 'hardhat'
import * as helpers from "../test/_testhelper";
import * as deployhelpers from "../scripts/_deployhelper";

async function main() {
	await helpers.extractAbi();

	// owner
	const [owner] = await ethers.getSigners();
	console.log("owner:", owner.address);
	console.log("owner balance:", await owner.getBalance());

	// network
	const networkName = hre.network.name
	console.log("network:", networkName);

	// factory
	const CryptocommoditiesFactory = await ethers.getContractAt('CryptocommoditiesFactory', '<CryptocommoditiesFactoryAddress>');
	let cryptocommoditiesFactory = await CryptocommoditiesFactory.deploy();

	// tx
	let tx;

	if (hre.network.name == 'polygon_mumbai') {
		console.log("deploying to polygon_mumbai");

		// ChainLinkAggregator Token
		console.log("ChainLinkAggregator deploying");
		const ChainLinkAggregator = await ethers.getContractFactory("DemoMockAggregator", owner);
		const chainLinkAggregator = await ChainLinkAggregator.deploy();
		await chainLinkAggregator.deployed();
		tx = await chainLinkAggregator.setDynamicPrice(300); tx.wait();
		console.log("ChainLinkAggregator:" + chainLinkAggregator.address);

		// deploy WBTC
		// https://mumbai.polygonscan.com/address/0x0d787a4a1548f673ed375445535a6c7a1ee56180
		// https://github.com/swaponline/MultiCurrencyWallet/blob/master/docs/FAUCETS.md
		tx = await cryptocommoditiesFactory.setPaymentToken("WBTC", '0x0d787a4a1548f673ed375445535a6c7A1EE56180', '0x007A22900a3B98143368Bd5906f8E17e9867581b', Math.floor(deployhelpers.DEF_PRICE_BTC_IN_USD * 10**6), 8); tx.wait();
		console.log("WBTC installed");
1
		// deploy ETH
		// https://mumbai.polygonscan.com/token/0xa6fa4fb5f76172d178d61b04b0ecd319c5d1c0aa
		// https://staging.aave.com/#/faucet
		// https://faucet.paradigm.xyz/
		tx = await cryptocommoditiesFactory.setPaymentToken("WETH", '0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa', "0x0715A7794a1dc8e42615F059dD6e406A6594651A", Math.floor(deployhelpers.DEF_PRICE_ETH_IN_USD * 10**6), 18); tx.wait();
		console.log("WETH installed");

		// deploy MATIC
		// https://faucet.polygon.technology/
		tx = await cryptocommoditiesFactory.setPaymentToken("COIN", cryptocommoditiesFactory.address, "0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada", Math.floor(deployhelpers.DEF_PRICE_MATIC_IN_USD * 10**6), 18); tx.wait();
		console.log("COIN installed");

		// deploy BNB
		console.log("BNB deploying");
		const BNB = await ethers.getContractFactory("FOO");
		const bnb = await BNB.deploy("BNB", "BNB");
		await bnb.deployed();
		tx = await cryptocommoditiesFactory.setPaymentToken("BNB", bnb.address, chainLinkAggregator.address, Math.floor(deployhelpers.DEF_PRICE_BNB_IN_USD * 10**6), 18); tx.wait();
		tx = await bnb.transfer('0x20caa5fa15c4177cd6946b8041ef40447db27539', ethers.utils.parseUnits("1000000", 18).toString()); tx.wait();
		console.log("BNB deployed to:", bnb.address);
		console.log("BNB owner balance: " + await bnb.balanceOf(owner.address));
		console.log("BNB 0x20caa5fa15c4177cd6946b8041ef40447db27539 balance: " + await bnb.balanceOf('0x20caa5fa15c4177cd6946b8041ef40447db27539'));
		console.log("BNB installed");

		// deploy USDT
		// https://mumbai.polygonscan.com/address/0xa02f6adc7926efebbd59fd43a84f4e0c0c91e832
		// https://calibration-faucet.filswan.com/#/dashboard
		tx = await cryptocommoditiesFactory.setPaymentToken("USDT", '0xa02f6adc7926efebbd59fd43a84f4e0c0c91e832', '0x92C09849638959196E976289418e5973CC96d645', Math.floor(deployhelpers.DEF_PRICE_USDT_IN_USD * 10**6), 6); tx.wait();
		console.log("USDT installed");

	}

	if (hre.network.name == 'polygon') {
		console.log("deploying to polygon");

		// checks for gas because ethersjs has gas hardcoded and this gives transaction underpriced error
		// https://github.com/ethers-io/ethers.js/issues/2828
		// https://github.com/ethers-io/ethers.js/issues/3370
		const gasEstimated = await cryptocommoditiesFactory.estimateGas.setPaymentToken("FOOBAR", '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6', '0xDE31F8bFBD8c84b5360CFACCa3539B938dd78ae6', Math.floor(deployhelpers.DEF_PRICE_BTC_IN_USD * 10**6), 18);
		console.log("gasEstimated:", gasEstimated);
		const GAS = await deployhelpers.calcGas(gasEstimated);
		//console.log("gas:", GAS);

		// deploy WBTC
		// https://polygonscan.com/token/0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6
		const tx1 = await cryptocommoditiesFactory.setPaymentToken("WBTC", '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6', '0xDE31F8bFBD8c84b5360CFACCa3539B938dd78ae6', Math.floor(deployhelpers.DEF_PRICE_BTC_IN_USD * 10**6), 18, GAS);
		await tx1.wait();
		console.log("WBTC installed");

		// deploy ETH
		// https://polygonscan.com/token/0x7ceb23fd6bc0add59e62ac25578270cff1b9f619
		const tx2 = await cryptocommoditiesFactory.setPaymentToken("WETH", '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', "0xF9680D99D6C9589e2a93a78A04A279e509205945", Math.floor(deployhelpers.DEF_PRICE_ETH_IN_USD * 10**6), 18, GAS);
		await tx2.wait();
		console.log("WETH installed");

		// deploy MATIC
		const tx3 = await cryptocommoditiesFactory.setPaymentToken("COIN", cryptocommoditiesFactory.address, "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0", Math.floor(deployhelpers.DEF_PRICE_MATIC_IN_USD * 10**6), 18, GAS);
		await tx3.wait();
		console.log("COIN installed");

		// deploy BNB
		// https://polygonscan.com/token/0x3BA4c387f786bFEE076A58914F5Bd38d668B42c3
		const tx4 = await cryptocommoditiesFactory.setPaymentToken("BNB", '0x3BA4c387f786bFEE076A58914F5Bd38d668B42c3', '0x82a6c4AF830caa6c97bb504425f6A66165C2c26e', Math.floor(deployhelpers.DEF_PRICE_BNB_IN_USD * 10**6), 18, GAS);
		await tx4.wait();
		console.log("BNB installed");

		// deploy USDT
		// https://polygonscan.com/token/0xc2132d05d31c914a87c6611c10748aeb04b58e8f
		const tx5 = await cryptocommoditiesFactory.setPaymentToken("USDT", '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', '0x0A6513e40db6EB1b165753AD52E80663aeA50545', Math.floor(deployhelpers.DEF_PRICE_USDT_IN_USD * 10**6), 18, GAS);
		await tx5.wait();
		console.log("USDT installed");

	}

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});

