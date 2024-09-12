	// **********************************************************************************************************************************
	// ******************************************************** Deprecated. Done from UI ************************************************
	// **********************************************************************************************************************************
	
import { ethers } from "hardhat";
import hre from 'hardhat'
import * as helpers from "../test/_testhelper";

async function main() {
	await helpers.extractAbi();

	// owner
	const [owner] = await ethers.getSigners();
	console.log("owner:", owner.address);
	console.log("owner balance:", await owner.getBalance());
	const networkName = hre.network.name
	console.log("network:", networkName);

	// **********************************************************************************************************************************
	// ************************************************************* Deploy *************************************************************
	// **********************************************************************************************************************************
	// deploy ICO
	console.log("ICO deploying");
	const ICO = await ethers.getContractFactory("GasClickICO");
	const ico = await ICO.deploy();
	await ico.deployed();
	console.log("ICO deployed to:", ico.address);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
