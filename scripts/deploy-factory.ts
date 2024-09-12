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

	// ***********************************************************************************************************************************************************
	// ************************************************************************** Install Factory ****************************************************************
	// ***********************************************************************************************************************************************************

	// deploy CryptocommoditiesFactory
	const CryptocommoditiesFactory = await ethers.getContractFactory("CryptocommoditiesFactory", owner);
	let cryptocommoditiesFactory = await CryptocommoditiesFactory.deploy();
	await cryptocommoditiesFactory.deployed();
	console.log("CryptocommoditiesFactory:" + cryptocommoditiesFactory.address);

	// ***********************************************************************************************************************************************************
	// ************************************************************************ Install Versionable Facets *******************************************************
	// ***********************************************************************************************************************************************************
	// deploy DiamondCutFacet (CUD)
	const DiamondCutFacetFactory = await ethers.getContractFactory('DiamondCutFacet')
	const diamondCutFacetStandalone = await DiamondCutFacetFactory.deploy();
	await diamondCutFacetStandalone.deployed();
	console.log('DiamondCutFacet deployed:', diamondCutFacetStandalone.address)

	// deploy DiamondLoupeFacet (R)
	const DiamondLoupeFacetFactory = await ethers.getContractFactory('DiamondLoupeFacet')
	const diamondLoupeFacetStandalone = await DiamondLoupeFacetFactory.deploy();
	await diamondLoupeFacetStandalone.deployed();
	console.log('DiamondLoupeFacet deployed:', diamondLoupeFacetStandalone.address)

	// deploy Common Facet
	const CommonFacetFactory = await ethers.getContractFactory("CommonFacet");
	const commonFacetStandalone = await CommonFacetFactory.deploy();
	await commonFacetStandalone.deployed();
	console.log("CommonFacet deployed:" + commonFacetStandalone.address);

	// deploy Crowdsale Facet
	const CrowdsaleFacetFactory = await ethers.getContractFactory("CrowdsaleFacet");
	const crowdsaleFacetStandalone = await CrowdsaleFacetFactory.deploy();
	await crowdsaleFacetStandalone.deployed();
	console.log("CrowdsaleFacet deployed:" + crowdsaleFacetStandalone.address);

	// deploy Vesting facet
	const VestingFacetFactory = await ethers.getContractFactory("VestingFacet");
	const vestingFacetStandalone = await VestingFacetFactory.deploy();
	await vestingFacetStandalone.deployed();
	console.log("VestingFacet deployed: " + vestingFacetStandalone.address);

	// deploy Token Facet
	const ERC20FacetFactory = await ethers.getContractFactory("ERC20Facet");
	const erc20FacetStandalone = await ERC20FacetFactory.deploy();
	await erc20FacetStandalone.deployed();
	console.log("ERC20Facet deployed:" + erc20FacetStandalone.address);

	// ***********************************************************************************************************************************************************
	// ************************************************************************* Register in factory *************************************************************
	// ***********************************************************************************************************************************************************
	// populate factory
	let tx = await cryptocommoditiesFactory.setFacetVersion('DiamondCutFacet', '1.0', diamondCutFacetStandalone.address); await tx.wait();
	console.log("Installed DiamondCutFacet");
	tx = await cryptocommoditiesFactory.setFacetVersion('DiamondLoupeFacet', '1.0', diamondLoupeFacetStandalone.address); await tx.wait();
	console.log("Installed DiamondLoupeFacet");
	tx = await cryptocommoditiesFactory.setFacetVersion('CommonFacet', '1.0', commonFacetStandalone.address); await tx.wait();
	console.log("Installed CommonFacet");
	tx = await cryptocommoditiesFactory.setFacetVersion('CrowdsaleFacet', '1.0', crowdsaleFacetStandalone.address); await tx.wait();
	console.log("Installed CrowdsaleFacet");
	tx = await cryptocommoditiesFactory.setFacetVersion('VestingFacet', '1.0', vestingFacetStandalone.address); await tx.wait();
	console.log("Installed VestingFacet");
	tx = await cryptocommoditiesFactory.setFacetVersion('ERC20Facet', '1.0', erc20FacetStandalone.address); await tx.wait();
	console.log("Installed ERC20Facet");

	console.log("Installed Factory Done.");

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
