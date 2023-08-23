import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import * as helpers from "./_testhelper";

// describe.skip
describe.skip("ico-002-standalone-vesting-config-test", function () {
	const hre = require("hardhat");

	let VestingFacet, vesting: Contract;
	let owner: SignerWithAddress, project: SignerWithAddress, liquidity: SignerWithAddress;
	let addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addrs;

	/********************************************************************************************************/
	/************************************************** hooks ***********************************************/
	/********************************************************************************************************/
	before(async() => {
		console.log('*******************************');
		console.log('******** Starting Tests *******');
		console.log('*******************************');
	});

	beforeEach(async() => {
		//console.log('--------------------');
		await hre.network.provider.send("hardhat_reset");

		VestingFacet = await ethers.getContractFactory("VestingFacet");
		vesting = await VestingFacet.deploy();
		await vesting.deployed();
		console.log("deployed vesting: " + vesting.address);

		[owner, project, liquidity, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
		[owner, project, liquidity, addr1, addr2, addr3, ...addrs].forEach(async(account, i) => {
			let balance = await ethers.provider.getBalance(account.address);
			console.log('%d - address: %s ; balance: %s', ++i, account.address, balance);
		});
	});

	afterEach(async() => {
		//await helpers.logICOStatus(vesting);
		console.log('--------------------');
	});
	
	after(async() => {
		console.log('--------- Ending Tests --------');
	});

	/********************************************************************************************************/
	/********************************************* supporting functions *************************************/
	/********************************************************************************************************/
	it("Initial Logs.", async() => {
		console.log("\n");
		console.log("Addresses:");
		console.log("\towner address: " + owner.address);
		console.log("\tvesting address: " + vesting.address);
		console.log("\tvesting owner address: " + await vesting.owner());
		console.log("\tproject address: " + project.address);
		console.log("\tliquidity address: " + liquidity.address);
		console.log("\n");
	});

	/********************************************************************************************************/
	/*************************************************** Owner **********************************************/
	/********************************************************************************************************/
	it("Only Owner functions", async() => {

		// vesting functions 
		await expect(vesting.createVesting(Date.now(), 60 * 60 * 24 * 30 * 12, 60 * 60 * 24 * 30 * 12 * 2, 60 * 60 * 24 * 30)).not.to.be.reverted;
		await expect(vesting.connect(addr1).createVesting(Date.now(), 60 * 60 * 24 * 30 * 12, 60 * 60 * 24 * 30 * 12 * 2, 60 * 60 * 24 * 30)).to.be.revertedWith('ERRW_OWNR_NOT');

		// vesting schedule functions
	});
	
	/********************************************************************************************************/
	/************************************************** Vesting *********************************************/
	/********************************************************************************************************/
	it("Should be able to create vesting", async() => {
		// vesting functions 
		await expect(vesting.createVesting(Date.now(), 60 * 60 * 24 * 30 * 12, 60 * 60 * 24 * 30 * 12 * 2, 60 * 60 * 24 * 30)).not.to.be.reverted;
		console.log(await vesting.getVestingIds());
		await expect((await vesting.getVestingIds()).length).to.equal(1);
		let vestingItem = await vesting.getVesting(vesting.getVestingIds()[0]);
		expect(vestingItem[1]).to.equal(60 * 60 * 24 * 30 * 12);
		expect(vestingItem[2]).to.equal(60 * 60 * 24 * 30 * 12 * 2);
		expect(vestingItem[3]).to.equal(60 * 60 * 24 * 30);
	});

	it("Should be able to create vestsing", async() => {
		// vesting schedule functions
	});

	it("Should do correct vesting computations", async() => {
		// vesting schedule functions
	});

	it("Should be able to release", async() => {
		// vesting schedule functions
	});

});
