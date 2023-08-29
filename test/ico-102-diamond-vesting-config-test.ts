import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import * as helpers from "./_testhelper";

// describe.skip
describe("ico-102-diamond-vesting-config-test", function () {
	const hre = require("hardhat");

	let owner: SignerWithAddress, project: SignerWithAddress, liquidity: SignerWithAddress;
	let addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addrs;

  let diamondCutContract: Contract, diamondLoupeContract: Contract;

	let CommonFacet, common: Contract;
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

		// get accounts
		[owner, project, liquidity, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
		[owner, project, liquidity, addr1, addr2, addr3, ...addrs].forEach(async(account, i) => {
			let balance = await ethers.provider.getBalance(account.address);
			console.log('%d - address: %s ; balance: %s', ++i, account.address, balance);
		});

		// deploy DiamondCutFacet
		const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet')
		let diamondCutFacet = await DiamondCutFacet.deploy()
		await diamondCutFacet.deployed()
		console.log('DiamondCutFacet deployed:', diamondCutFacet.address)

		// deploy Diamond
		const Diamond = await ethers.getContractFactory('Diamond')
		let diamond = await Diamond.deploy(diamondCutFacet.address)
		await diamond.deployed()
		console.log('Diamond deployed:', diamond.address)
		diamondCutContract = await ethers.getContractAt('DiamondCutFacet', diamond.address)

		// deploy DiamondLoupeFacet
		const DiamondLoupeFacet = await ethers.getContractFactory('DiamondLoupeFacet')
		let diamondLoupeFacet = await DiamondLoupeFacet.deploy()
		await diamondLoupeFacet.deployed()
    diamondLoupeContract = await ethers.getContractAt('DiamondLoupeFacet', diamond.address)
		console.log('DiamondLoupeFacet deployed:', diamondLoupeFacet.address)

		// attach DiamondLoupeFacet
		let _diamondCut = [{ facetAddress: diamondLoupeFacet.address, action: helpers.FacetCutAction.Add, functionSelectors: helpers.getSelectors(diamondLoupeFacet), }];
		await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;
		console.log("DiamondLoupeFacet attached as " + diamondCutContract.address);

		// deploy Common facet
		CommonFacet = await ethers.getContractFactory("CommonFacet");
		let commonFacet = await CommonFacet.deploy();
		await commonFacet.deployed();
		common = await ethers.getContractAt('CommonFacet', diamond.address)
		console.log("CommonFacet deployed: " + commonFacet.address);

		// attach Common facet
		//console.log('attachig functions:', getSelectors(commonFacet))
		_diamondCut = [{ facetAddress: commonFacet.address, action: helpers.FacetCutAction.Add, functionSelectors: helpers.getSelectors(commonFacet), }];
		await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;
		console.log("CommonFacet attached as " + common.address);

		// deploy Vesting facet
		VestingFacet = await ethers.getContractFactory("VestingFacet");
		let vestingFacet = await VestingFacet.deploy();
		await vestingFacet.deployed();
    vesting = await ethers.getContractAt('VestingFacet', diamond.address)
		console.log("VestingFacet deployed: " + vestingFacet.address);

		// attach Token facet ex Common
		const vestingFacetExCommonFacetSelectors = helpers.removeSelectors(helpers.getSelectors(vestingFacet), helpers.getSelectors(commonFacet));
		//console.log('attachig functions:', vestingFacetExCommonFacetSelectors)
		_diamondCut = [{ facetAddress: vestingFacet.address, action: helpers.FacetCutAction.Add, functionSelectors: vestingFacetExCommonFacetSelectors, }];
		await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;
		console.log("VestingFacet attached as " + vesting.address);

		// deploy Token facet
		ERC20Facet = await ethers.getContractFactory("ERC20Facet");
		let erc20Facet = await ERC20Facet.deploy();
		await erc20Facet.deployed();
    token = await ethers.getContractAt('ERC20Facet', diamond.address)
		console.log("ERC20Facet deployed: " + erc20Facet.address);

		// attach Token facet ex Common
		const erc20FacetExCommonFacetSelectors = helpers.removeSelectors(helpers.getSelectors(erc20Facet), helpers.getSelectors(commonFacet));
		//console.log('attachig functions:', erc20FacetExCommonFacetSelectors)
		_diamondCut = [{ facetAddress: erc20Facet.address, action: helpers.FacetCutAction.Add, functionSelectors: erc20FacetExCommonFacetSelectors, }];
		await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;
		console.log("ERC20Facet attached as " + token.address);

		// initialize
		console.log('initializing')
		await expect(await common.owner()).to.equal('0x0000000000000000000000000000000000000000');
		await expect(token.initialize("CatallacticERC20", "CATA", BigInt(200_000_000 * 10**18))).not.to.be.reverted;
		await expect(await common.owner()).to.equal(owner.address);
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
		await expect(vesting.createVesting(Date.now(), helpers.TIME.MILLIS_IN_MONTH, helpers.TIME.MILLIS_IN_YEAR, 12)).not.to.be.reverted;
		await expect(vesting.connect(addr1).createVesting(Date.now(), helpers.TIME.MILLIS_IN_MONTH, helpers.TIME.MILLIS_IN_YEAR, 12)).to.be.revertedWith('ERRW_OWNR_NOT');

		// vesting schedule functions
		await expect(vesting.createVestingSchedule(addr1.address, 100_000_000, 0)).to.be.revertedWith('onlyGrantor');
		await expect(vesting.addGrantor(owner.address, true)).not.to.be.reverted;
		await expect(vesting.createVestingSchedule(addr1.address, 100_000_000, 0)).not.to.be.reverted;

		// vesting release schedule functions
		await expect(vesting.connect(addr1).setTokenAddress(token.address)).to.be.revertedWith('Ownable: caller is not the owner');
	});
	
	/********************************************************************************************************/
	/************************************************** Vesting *********************************************/
	/********************************************************************************************************/
	it("Should be able to create vesting", async() => {
		await expect(vesting.createVesting(Date.now(), helpers.TIME.MILLIS_IN_MONTH, helpers.TIME.MILLIS_IN_YEAR, 12)).not.to.be.reverted;
		await expect((await vesting.getVestingIds()).length).to.equal(1);
		await expect((await vesting.getVestingIds())[0]).to.equal(0);
		let vestingItem = await vesting.getVesting(0);
		expect(vestingItem[1]).to.equal(helpers.TIME.MILLIS_IN_MONTH);
		expect(vestingItem[2]).to.equal(helpers.TIME.MILLIS_IN_YEAR);
		expect(vestingItem[3]).to.equal(12);
	});

	it("Should be able to create vesting schedule", async() => {
		await expect(vesting.createVesting(Date.now(), helpers.TIME.MILLIS_IN_MONTH, helpers.TIME.MILLIS_IN_YEAR, 12)).not.to.be.reverted;

		await expect(vesting.addGrantor(owner.address, true)).not.to.be.reverted;
		await expect(vesting.createVestingSchedule(addr1.address, 100_000_000, 0)).not.to.be.reverted;

		await expect(await vesting.getTotalVestableAmount()).to.equal(100_000_000);
		await expect((await vesting.getVestingSchedulesIds()).length).to.equal(1);
		await expect((await vesting.getVestingSchedulesIds())[0]).to.equal(0);
		let vestingScheduleItem = await vesting.getVestingSchedule(0);
		expect(vestingScheduleItem[0]).to.equal(addr1.address);
		expect(vestingScheduleItem[1]).to.equal(100_000_000);
		expect(vestingScheduleItem[2]).to.equal(0);
	});

	it("Should do correct vesting computations", async() => {

		await expect(vesting.createVesting(Date.now(), helpers.TIME.MILLIS_IN_MONTH, helpers.TIME.MILLIS_IN_YEAR, 12)).not.to.be.reverted;

		await expect(vesting.addGrantor(owner.address, true)).not.to.be.reverted;
		await expect(vesting.createVestingSchedule(addr1.address, 120_000_000, 0)).not.to.be.reverted;

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
		await expect(vesting.createVesting(Date.now(), helpers.TIME.MILLIS_IN_MONTH, helpers.TIME.MILLIS_IN_YEAR, 12)).not.to.be.reverted;

		await expect(vesting.addGrantor(owner.address, true)).not.to.be.reverted;
		await expect(vesting.createVestingSchedule(addr1.address, 120_000_000, 0)).not.to.be.reverted;
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
