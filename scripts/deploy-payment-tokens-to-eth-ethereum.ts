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
		tx = await cryptocommoditiesFactory.setPaymentToken("WBTC", wbtc.address, "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43", Math.floor(deployhelpers.DEF_PRICE_BTC_IN_USD * 10**6), 18); tx.wait();
		tx = await cryptocommoditiesFactory.setPaymentToken("COIN", cryptocommoditiesFactory.address, "0x694AA1769357215DE4FAC081bf1f309aDC325306", Math.floor(deployhelpers.DEF_PRICE_ETH_IN_USD * 10**6), 18); tx.wait();
		tx = await cryptocommoditiesFactory.setPaymentToken("MATIC", matic.address, deployhelpers.ZERO_ADDRESS, Math.floor(deployhelpers.DEF_PRICE_MATIC_IN_USD * 10**6), 18); tx.wait();
		tx = await cryptocommoditiesFactory.setPaymentToken("BNB", bnb.address, deployhelpers.ZERO_ADDRESS, Math.floor(deployhelpers.DEF_PRICE_BNB_IN_USD * 10**6), 18); tx.wait();
		tx = await cryptocommoditiesFactory.setPaymentToken("USDT", usdt.address, deployhelpers.ZERO_ADDRESS, Math.floor(deployhelpers.DEF_PRICE_USDT_IN_USD * 10**6), 18); tx.wait();

	}

	if (hre.network.name == 'ethereum') {
		console.log("deploying to ethereum");

		// add Payment Tokens
		await cryptocommoditiesFactory.setPaymentToken("WBTC", '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c', Math.floor(deployhelpers.DEF_PRICE_BTC_IN_USD * 10**6), 18);				
		await cryptocommoditiesFactory.setPaymentToken("COIN", cryptocommoditiesFactory.address, "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", Math.floor(deployhelpers.DEF_PRICE_ETH_IN_USD * 10**6), 18);
		await cryptocommoditiesFactory.setPaymentToken("MATIC", '0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa', "0x7bAC85A8a13A4BcD8abb3eB7d6b4d632c5a57676", Math.floor(deployhelpers.DEF_PRICE_MATIC_IN_USD * 10**6), 18);
		// https://etherscan.io/token/0xB8c77482e45F1F44dE1745F52C74426C631bDD52
		await cryptocommoditiesFactory.setPaymentToken("BNB", '0xB8c77482e45F1F44dE1745F52C74426C631bDD52', '0x14e613AC84a31f709eadbdF89C6CC390fDc9540A', Math.floor(deployhelpers.DEF_PRICE_BNB_IN_USD * 10**6), 18);
		await cryptocommoditiesFactory.setPaymentToken("USDT", '', '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D', Math.floor(deployhelpers.DEF_PRICE_USDT_IN_USD * 10**6), 18);

	}

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
