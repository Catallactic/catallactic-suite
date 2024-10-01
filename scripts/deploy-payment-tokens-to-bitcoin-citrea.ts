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
	const cryptocommoditiesFactory = await ethers.getContractAt('CryptocommoditiesFactory', '0x8fa5a7953E12Ac9056864098d07014F6F433928b');
	console.log("used cryptocommoditiesFactory at: ", cryptocommoditiesFactory.address);
	console.log("deploying to citrea_devnet");

	if (hre.network.name == 'citrea_testnet') {
		// deploy WBTC
		console.log("WBTC deploying");
		console.log("WBTC deployed at: ", cryptocommoditiesFactory.address);
		let tx = await cryptocommoditiesFactory.setPaymentToken("COIN", cryptocommoditiesFactory.address, deployhelpers.ZERO_ADDRESS, Math.floor(deployhelpers.DEF_PRICE_BTC_IN_USD * 10**6), 18); await tx.wait();
		console.log("WBTC installed");

		// deploy ETH
		console.log("ETH deploying");
		const ETH = await ethers.getContractFactory("FOO");
		const eth = await ETH.deploy("ETH", "ETH");
		await eth.deployed();
		console.log("ETH deployed at: ", eth.address);
		tx = await cryptocommoditiesFactory.setPaymentToken("ETH", eth.address, deployhelpers.ZERO_ADDRESS, Math.floor(deployhelpers.DEF_PRICE_ETH_IN_USD * 10**6), 18); await tx.wait();
		console.log("ETH installed");

		// deploy MATIC
		console.log("MATIC deploying");
		const MATIC = await ethers.getContractFactory("FOO");
		const matic = await MATIC.deploy("MATIC", "MATIC");
		await matic.deployed();
		console.log("MATIC deployed at: ", matic.address);
		tx = await cryptocommoditiesFactory.setPaymentToken("MATIC", matic.address, deployhelpers.ZERO_ADDRESS, Math.floor(deployhelpers.DEF_PRICE_MATIC_IN_USD * 10**6), 18); await tx.wait();
		console.log("MATIC installed");

		// deploy BNB
		console.log("BNB deploying");
		const BNB = await ethers.getContractFactory("FOO");
		const bnb = await BNB.deploy("BNB", "BNB");
		await bnb.deployed();
		console.log("BNB deployed at: ", bnb.address);
		tx = await cryptocommoditiesFactory.setPaymentToken("BNB", bnb.address, deployhelpers.ZERO_ADDRESS, Math.floor(deployhelpers.DEF_PRICE_BNB_IN_USD * 10**6), 18); await tx.wait();
		console.log("BNB installed");

		// deploy USDT
		console.log("USDT deploying");
		const USDT = await ethers.getContractFactory("FOO");
		const usdt = await USDT.deploy("USDT", "USDT");
		await usdt.deployed();
		console.log("USDT deployed at: ", usdt.address);
		tx = await cryptocommoditiesFactory.setPaymentToken("USDT", usdt.address, deployhelpers.ZERO_ADDRESS, Math.floor(deployhelpers.DEF_PRICE_USDT_IN_USD * 10**6), 18); await tx.wait();
		console.log("USDT installed");

		console.log("deployed payment tokens for citrea_devnet");

	}

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
