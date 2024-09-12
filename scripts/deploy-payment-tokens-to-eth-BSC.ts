import { ethers } from "hardhat";
import hre from 'hardhat'
import * as helpers from "../test/_testhelper";

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

	if (hre.network.name == 'bsc_testnet') {

		// ChainLinkAggregator Token
		const ChainLinkAggregator = await ethers.getContractFactory("DemoMockAggregator", owner);
		const chainLinkAggregator = await ChainLinkAggregator.deploy();
		await chainLinkAggregator.deployed();
		console.log("ChainLinkAggregator:" + chainLinkAggregator.address);

		// deploy Token
		const Token = await ethers.getContractFactory("DemoToken");
		const token = await Token.deploy();
		await token.deployed();
		console.log("Token deployed to:", token.address);
		await cryptocommoditiesFactory.setTokenAddress(token.address);

		// deploy WBTC
		// N/A

		// deploy ETH

		// deploy MATIC

		// deploy BNB

		// deploy USDT

	}
	if (hre.network.name == 'bsc') {

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
