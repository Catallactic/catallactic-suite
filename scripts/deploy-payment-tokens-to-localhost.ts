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
		await cryptocommoditiesFactory.setPaymentToken("WBTC", wbtc.address, deployhelpers.ZERO_ADDRESS, Math.floor(deployhelpers.DEF_PRICE_BTC_IN_USD * 10**6), 18);
		await cryptocommoditiesFactory.setPaymentToken("COIN", cryptocommoditiesFactory.address, deployhelpers.ZERO_ADDRESS, Math.floor(deployhelpers.DEF_PRICE_ETH_IN_USD * 10**6), 18);
		await cryptocommoditiesFactory.setPaymentToken("MATIC", matic.address, deployhelpers.ZERO_ADDRESS, Math.floor(deployhelpers.DEF_PRICE_MATIC_IN_USD * 10**6), 18);
		await cryptocommoditiesFactory.setPaymentToken("BNB", bnb.address, deployhelpers.ZERO_ADDRESS, Math.floor(deployhelpers.DEF_PRICE_BNB_IN_USD * 10**6), 18);
		await cryptocommoditiesFactory.setPaymentToken("USDT", usdt.address, deployhelpers.ZERO_ADDRESS, Math.floor(deployhelpers.DEF_PRICE_USDT_IN_USD * 10**6), 18);

	}

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
