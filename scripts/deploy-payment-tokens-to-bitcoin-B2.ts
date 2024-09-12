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

	if (hre.network.name == 'b2network_testnet') {
		console.log("deploying to b2network_testnet");

		// deploy WBTC
		// N/A

		// deploy ETH

		// deploy MATIC

		// deploy BNB

		// deploy USDT

		console.log("deployed to b2network_testnet");
	}

	if (hre.network.name == 'b2network') {
		console.log("deploying to b2network");

		// deploy WBTC
		// N/A

		// deploy ETH

		// deploy MATIC

		// deploy BNB

		// deploy USDT

		console.log("deployed to b2network");
	}

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
