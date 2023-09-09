import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import * as helpers from "./_testhelper";

// describe.skip
describe("ico-002-standalone-vesting-config-test", function () {
	const hre = require("hardhat");

	let owner: SignerWithAddress, project: SignerWithAddress, liquidity: SignerWithAddress;
	let addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addrs;

	let VestingFacet, vesting: Contract;
	let ERC20Facet, token: Contract;

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

		[owner, project, liquidity, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
		[owner, project, liquidity, addr1, addr2, addr3, ...addrs].forEach(async(account, i) => {
			let balance = await ethers.provider.getBalance(account.address);
			console.log('%d - address: %s ; balance: %s', ++i, account.address, balance);
		});

		// deploy vesting smart contract
		VestingFacet = await ethers.getContractFactory("VestingFacet");
		vesting = await VestingFacet.deploy();
		await vesting.deployed();
		console.log("deployed vesting: " + vesting.address);

		// deploy token smart contract
		ERC20Facet = await ethers.getContractFactory("ERC20Facet");
		token = await ERC20Facet.deploy();
		await token.deployed();
		console.log("deployed Token:" + token.address);

		// initialize
		console.log('initializing')
		await expect(await token.owner()).to.equal('0x0000000000000000000000000000000000000000');
		await expect(token.initialize("CatallacticERC20", "CATA", BigInt(200_000_000 * 10**18))).not.to.be.reverted;
		await expect(await token.owner()).to.equal(owner.address);
		console.log('initialized');

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
		await expect(vesting.createVesting('abc', Date.now(), helpers.TIME.MILLIS_IN_MONTH, helpers.TIME.MILLIS_IN_YEAR, 12)).not.to.be.reverted;
		await expect(vesting.connect(addr1).createVesting('abc', Date.now(), helpers.TIME.MILLIS_IN_MONTH, helpers.TIME.MILLIS_IN_YEAR, 12)).to.be.revertedWith('ERRW_OWNR_NOT');

		// vesting schedule functions
		await expect(vesting.createVestingSchedule(addr1.address, 100_000_000, 'abc')).to.be.revertedWith('onlyGrantor');
		await expect(vesting.addGrantor(owner.address)).not.to.be.reverted;
		await expect(vesting.createVestingSchedule(addr1.address, 100_000_000, 'abc')).not.to.be.reverted;

		// vesting release schedule functions
		await expect(vesting.connect(addr1).setTokenAddress(token.address)).to.be.revertedWith('Ownable: caller is not the owner');
	});
	
	/********************************************************************************************************/
	/************************************************** Vesting *********************************************/
	/********************************************************************************************************/
	it("Should be able to create vesting", async() => {
		await expect(vesting.createVesting('abc', Date.now(), helpers.TIME.MILLIS_IN_MONTH, helpers.TIME.MILLIS_IN_YEAR, 12)).not.to.be.reverted;
		await expect((await vesting.getVestingIds()).length).to.equal(1);
		await expect((await vesting.getVestingIds())[0]).to.equal('abc');
		let vestingItem = await vesting.getVesting('abc');
		expect(vestingItem[1]).to.equal(helpers.TIME.MILLIS_IN_MONTH);
		expect(vestingItem[2]).to.equal(helpers.TIME.MILLIS_IN_YEAR);
		expect(vestingItem[3]).to.equal(12);
	});

	it("Should be able to create vesting schedule", async() => {
		await expect(vesting.createVesting('abc', Date.now(), helpers.TIME.MILLIS_IN_MONTH, helpers.TIME.MILLIS_IN_YEAR, 12)).not.to.be.reverted;

		await expect(vesting.addGrantor(owner.address)).not.to.be.reverted;
		await expect(vesting.createVestingSchedule(addr1.address, 100_000_000, 'abc')).not.to.be.reverted;

		await expect(await vesting.getTotalVestableAmount()).to.equal(100_000_000);
		await expect((await vesting.getVestingSchedulesIds()).length).to.equal(1);
		await expect((await vesting.getVestingSchedulesIds())[0]).to.equal(0);
		let vestingScheduleItem = await vesting.getVestingSchedule(0);
		expect(vestingScheduleItem[0]).to.equal(addr1.address);
		expect(vestingScheduleItem[1]).to.equal(100_000_000);
		expect(vestingScheduleItem[2]).to.equal('abc');
	});

	it("Should do correct vesting computations", async() => {

		await expect(vesting.createVesting('abc', Date.now(), helpers.TIME.MILLIS_IN_MONTH, helpers.TIME.MILLIS_IN_YEAR, 12)).not.to.be.reverted;

		await expect(vesting.addGrantor(owner.address)).not.to.be.reverted;
		await expect(vesting.createVestingSchedule(addr1.address, 120_000_000, 'abc')).not.to.be.reverted;

		// now
		await expect(await vesting.computeReleasableAmount(0)).to.equal(0);

		// in 1 day
		await hre.ethers.provider.send('evm_mine', [ Date.now() + helpers.TIME.MILLIS_IN_DAY ]);
		await expect(await vesting.computeReleasableAmount(0)).to.equal(0);

		// in 29 days
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 29 * helpers.TIME.MILLIS_IN_DAY ]);
		await expect(await vesting.computeReleasableAmount(0)).to.equal(0);

		// in 31 days
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 31 * helpers.TIME.MILLIS_IN_DAY ]);
		await expect(await vesting.computeReleasableAmount(0)).to.equal(0);		

		// in 59 days
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 59 * helpers.TIME.MILLIS_IN_DAY ]);
		await expect(await vesting.computeReleasableAmount(0)).to.equal(0);	

		// in 61 days
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 61 * helpers.TIME.MILLIS_IN_DAY ]);
		await expect(await vesting.computeReleasableAmount(0)).to.equal(10_000_000);

		// in 91 days
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 91 * helpers.TIME.MILLIS_IN_DAY ]);
		await expect(await vesting.computeReleasableAmount(0)).to.equal(20_000_000);

		// in 122 days
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 122 * helpers.TIME.MILLIS_IN_DAY ]);
		await expect(await vesting.computeReleasableAmount(0)).to.equal(30_000_000);

		// in 306 days
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 306 * helpers.TIME.MILLIS_IN_DAY ]);
		await expect(await vesting.computeReleasableAmount(0)).to.equal(90_000_000);

		// in 396 days
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 396 * helpers.TIME.MILLIS_IN_DAY ]);
		await expect(await vesting.computeReleasableAmount(0)).to.equal(120_000_000);

		// in 480 days
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 480 * helpers.TIME.MILLIS_IN_DAY ]);
		await expect(await vesting.computeReleasableAmount(0)).to.equal(120_000_000);

	});

	it("Should be able to release", async() => {
		await expect(vesting.createVesting('abc', Date.now(), helpers.TIME.MILLIS_IN_MONTH, helpers.TIME.MILLIS_IN_YEAR, 12)).not.to.be.reverted;

		await expect(vesting.addGrantor(owner.address)).not.to.be.reverted;
		await expect(vesting.createVestingSchedule(addr1.address, 120_000_000, 'abc')).not.to.be.reverted;
		await expect(vesting.setTokenAddress(token.address)).not.to.be.reverted;
		await expect(token.transfer(vesting.address, 120_000_000)).not.to.be.reverted;

		// now
		await expect(vesting.release(0)).not.to.be.reverted;
		await expect(await token.balanceOf(addr1.address)).to.equal(0);

		// in 1 day
		await hre.ethers.provider.send('evm_mine', [ Date.now() + helpers.TIME.MILLIS_IN_DAY ]);
		await expect(vesting.release(0)).not.to.be.reverted;
		await expect(await token.balanceOf(addr1.address)).to.equal(0);

		// in 29 days
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 29 * helpers.TIME.MILLIS_IN_DAY ]);
		await expect(vesting.release(0)).not.to.be.reverted;
		await expect(await token.balanceOf(addr1.address)).to.equal(0);

		// in 31 days
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 31 * helpers.TIME.MILLIS_IN_DAY ]);
		await expect(vesting.release(0)).not.to.be.reverted;
		await expect(await token.balanceOf(addr1.address)).to.equal(0);

		// in 59 days
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 59 * helpers.TIME.MILLIS_IN_DAY ]);
		await expect(vesting.release(0)).not.to.be.reverted;
		await expect(await token.balanceOf(addr1.address)).to.equal(0);

		// in 61 days
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 61 * helpers.TIME.MILLIS_IN_DAY ]);
		await expect(vesting.release(0)).not.to.be.reverted;
		await expect(await token.balanceOf(addr1.address)).to.equal(10_000_000);

		// in 91 days
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 91 * helpers.TIME.MILLIS_IN_DAY ]);
		await expect(vesting.release(0)).not.to.be.reverted;
		await expect(await token.balanceOf(addr1.address)).to.equal(20_000_000);

		// in 122 days
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 122 * helpers.TIME.MILLIS_IN_DAY ]);
		await expect(vesting.release(0)).not.to.be.reverted;
		await expect(await token.balanceOf(addr1.address)).to.equal(30_000_000);

		// in 306 days
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 306 * helpers.TIME.MILLIS_IN_DAY ]);
		await expect(vesting.release(0)).not.to.be.reverted;
		await expect(await token.balanceOf(addr1.address)).to.equal(90_000_000);

		// in 396 days
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 396 * helpers.TIME.MILLIS_IN_DAY ]);
		await expect(vesting.release(0)).not.to.be.reverted;
		await expect(await token.balanceOf(addr1.address)).to.equal(120_000_000);

		// in 480 days
		await hre.ethers.provider.send('evm_mine', [ Date.now() + 480 * helpers.TIME.MILLIS_IN_DAY ]);
		await expect(vesting.release(0)).not.to.be.reverted;
		await expect(await token.balanceOf(addr1.address)).to.equal(120_000_000);

	});

});
