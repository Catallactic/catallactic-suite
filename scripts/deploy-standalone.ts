// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import hre from 'hardhat'
import axios from 'axios';

async function main() {
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

	// **********************************************************************************************************************************
	// *************************************************** Configure Default prices *****************************************************
	// **********************************************************************************************************************************
	const DEF_PRICE_BTC_IN_USD = 23000;
	const DEF_PRICE_ETH_IN_USD = 1600;
	const DEF_PRICE_MATIC_IN_USD = 1.2;
	const DEF_PRICE_BNB_IN_USD = 300;
	const DEF_PRICE_USDT_IN_USD = 1;

	const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

	// **********************************************************************************************************************************
	// ***************************************************** Configure Localhost Tokens *************************************************
	// **********************************************************************************************************************************
	// https://docs.chain.link/data-feeds/price-feeds/addresses?network=polygon

	if (hre.network.name == 'localhost') {
		console.log("deploying to localhost");

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
		await ico.setTokenAddress(token.address);

		// deploy WBTC
		const WBTC = await ethers.getContractFactory("FOO");
		const wbtc = await WBTC.deploy("WBTC", "WBTC");
		await wbtc.deployed();
		await wbtc.transfer('0x20caa5fa15c4177cd6946b8041ef40447db27539', ethers.utils.parseUnits("1000000", 18).toString());
		await ico.setPaymentToken("WBTC", wbtc.address, ZERO_ADDRESS, Math.floor(DEF_PRICE_BTC_IN_USD * 10**6), 18);
		console.log("WBTC deployed to:", wbtc.address);
		console.log("WBTC owner balance: " + await wbtc.balanceOf(owner.address));
		console.log("WBTC 0x20caa5fa15c4177cd6946b8041ef40447db27539 balance: " + await wbtc.balanceOf('0x20caa5fa15c4177cd6946b8041ef40447db27539'));

		// deploy ETH
		await ico.setPaymentToken("COIN", ico.address, ZERO_ADDRESS, Math.floor(DEF_PRICE_ETH_IN_USD * 10**6), 18);
		console.log("COIN installed");
		await owner.sendTransaction({
			to: '0x20caa5fa15c4177cd6946b8041ef40447db27539',
			value: ethers.utils.parseUnits('4000', 18),
			gasPrice: '0x5b9aca00',
			gasLimit: '0x56f90',
		});

		// deploy MATIC
		const MATIC = await ethers.getContractFactory("FOO");
		const matic = await MATIC.deploy("MATIC", "MATIC");
		await matic.deployed();
		await matic.transfer('0x20caa5fa15c4177cd6946b8041ef40447db27539', ethers.utils.parseUnits("1000000", 18).toString());
		await ico.setPaymentToken("MATIC", matic.address, ZERO_ADDRESS, Math.floor(DEF_PRICE_MATIC_IN_USD * 10**6), 18);
		console.log("MATIC deployed to:", matic.address);
		console.log("MATIC owner balance: " + await matic.balanceOf(owner.address));
		console.log("MATIC 0x20caa5fa15c4177cd6946b8041ef40447db27539 balance: " + await matic.balanceOf('0x20caa5fa15c4177cd6946b8041ef40447db27539'));

		// deploy BNB
		const BNB = await ethers.getContractFactory("FOO");
		const bnb = await BNB.deploy("BNB", "BNB");
		await bnb.deployed();
		await bnb.transfer('0x20caa5fa15c4177cd6946b8041ef40447db27539', ethers.utils.parseUnits("1000000", 18).toString());
		await ico.setPaymentToken("BNB", bnb.address, ZERO_ADDRESS, Math.floor(DEF_PRICE_BNB_IN_USD * 10**6), 18);
		console.log("BNB deployed to:", bnb.address);
		console.log("BNB owner balance: " + await bnb.balanceOf(owner.address));
		console.log("BNB 0x20caa5fa15c4177cd6946b8041ef40447db27539 balance: " + await bnb.balanceOf('0x20caa5fa15c4177cd6946b8041ef40447db27539'));

		// deploy USDT
		const USDT = await ethers.getContractFactory("FOO");
		const usdt = await USDT.deploy("USDT", "USDT");
		await usdt.deployed();
		await usdt.transfer('0x20caa5fa15c4177cd6946b8041ef40447db27539', ethers.utils.parseUnits("1000000", 18).toString());
		await ico.setPaymentToken("USDT", usdt.address, ZERO_ADDRESS, Math.floor(DEF_PRICE_USDT_IN_USD * 10**6), 18);
		console.log("USDT deployed to:", usdt.address);
		console.log("USDT owner balance: " + await usdt.balanceOf(owner.address));
		console.log("USDT 0x20caa5fa15c4177cd6946b8041ef40447db27539 balance: " + await usdt.balanceOf('0x20caa5fa15c4177cd6946b8041ef40447db27539'));

	}

	// **********************************************************************************************************************************
	// *************************************************** Configure Ethereum Tokens ****************************************************
	// **********************************************************************************************************************************
	if (hre.network.name == 'sepolia') {
		console.log("deploying to sepolia");

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
		await ico.setTokenAddress(token.address);

		// deploy WBTC
		const WBTC = await ethers.getContractFactory("FOO");
		const wbtc = await WBTC.deploy("WBTC", "WBTC");
		await wbtc.deployed();
		await wbtc.transfer('0x20caa5fa15c4177cd6946b8041ef40447db27539', ethers.utils.parseUnits("1000000", 18).toString());
		await ico.setPaymentToken("WBTC", wbtc.address, "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43", Math.floor(DEF_PRICE_BTC_IN_USD * 10**6), 18);
		console.log("WBTC deployed to:", wbtc.address);
		console.log("WBTC owner balance: " + await wbtc.balanceOf(owner.address));
		console.log("WBTC 0x20caa5fa15c4177cd6946b8041ef40447db27539 balance: " + await wbtc.balanceOf('0x20caa5fa15c4177cd6946b8041ef40447db27539'));

		// deploy ETH
		await ico.setPaymentToken("COIN", ico.address, "0x694AA1769357215DE4FAC081bf1f309aDC325306", Math.floor(DEF_PRICE_ETH_IN_USD * 10**6), 18);
		console.log("COIN installed");

		// deploy MATIC
		const MATIC = await ethers.getContractFactory("FOO");
		const matic = await MATIC.deploy("MATIC", "MATIC");
		await matic.deployed();
		await matic.transfer('0x20caa5fa15c4177cd6946b8041ef40447db27539', ethers.utils.parseUnits("1000000", 18).toString());
		await ico.setPaymentToken("MATIC", matic.address, ZERO_ADDRESS, Math.floor(DEF_PRICE_MATIC_IN_USD * 10**6), 18);
		console.log("MATIC deployed to:", matic.address);
		console.log("MATIC owner balance: " + await matic.balanceOf(owner.address));
		console.log("MATIC 0x20caa5fa15c4177cd6946b8041ef40447db27539 balance: " + await matic.balanceOf('0x20caa5fa15c4177cd6946b8041ef40447db27539'));

		// deploy BNB
		const BNB = await ethers.getContractFactory("FOO");
		const bnb = await BNB.deploy("BNB", "BNB");
		await bnb.deployed();
		await bnb.transfer('0x20caa5fa15c4177cd6946b8041ef40447db27539', ethers.utils.parseUnits("1000000", 18).toString());
		await ico.setPaymentToken("BNB", bnb.address, ZERO_ADDRESS, Math.floor(DEF_PRICE_BNB_IN_USD * 10**6), 18);
		console.log("BNB deployed to:", bnb.address);
		console.log("BNB owner balance: " + await bnb.balanceOf(owner.address));
		console.log("BNB 0x20caa5fa15c4177cd6946b8041ef40447db27539 balance: " + await bnb.balanceOf('0x20caa5fa15c4177cd6946b8041ef40447db27539'));

		// deploy USDT
		const USDT = await ethers.getContractFactory("FOO");
		const usdt = await USDT.deploy("USDT", "USDT");
		await usdt.deployed();
		await usdt.transfer('0x20caa5fa15c4177cd6946b8041ef40447db27539', ethers.utils.parseUnits("1000000", 18).toString());
		await ico.setPaymentToken("USDT", usdt.address, ZERO_ADDRESS, Math.floor(DEF_PRICE_USDT_IN_USD * 10**6), 18);
		console.log("USDT deployed to:", usdt.address);
		console.log("USDT owner balance: " + await usdt.balanceOf(owner.address));
		console.log("USDT 0x20caa5fa15c4177cd6946b8041ef40447db27539 balance: " + await usdt.balanceOf('0x20caa5fa15c4177cd6946b8041ef40447db27539'));

	}

	if (hre.network.name == 'ethereum') {
		console.log("deploying to ethereum");

		// deploy WBTC
		await ico.setPaymentToken("WBTC", '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c', Math.floor(DEF_PRICE_BTC_IN_USD * 10**6), 18);				

		// deploy ETH
		await ico.setPaymentToken("COIN", ico.address, "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", Math.floor(DEF_PRICE_ETH_IN_USD * 10**6), 18);

		// deploy MATIC
		await ico.setPaymentToken("MATIC", '0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa', "0x7bAC85A8a13A4BcD8abb3eB7d6b4d632c5a57676", Math.floor(DEF_PRICE_MATIC_IN_USD * 10**6), 18);

		// deploy BNB
		// https://etherscan.io/token/0xB8c77482e45F1F44dE1745F52C74426C631bDD52
		await ico.setPaymentToken("BNB", '0xB8c77482e45F1F44dE1745F52C74426C631bDD52', '0x14e613AC84a31f709eadbdF89C6CC390fDc9540A', Math.floor(DEF_PRICE_BNB_IN_USD * 10**6), 18);

		// deploy USDT
		await ico.setPaymentToken("USDT", '', '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D', Math.floor(DEF_PRICE_USDT_IN_USD * 10**6), 18);

	}

	// **********************************************************************************************************************************
	// *************************************************** Configure Polygon Tokens *****************************************************
	// **********************************************************************************************************************************
	if (hre.network.name == 'polygon_mumbai') {
		console.log("deploying to polygon_mumbai");

		// ChainLinkAggregator Token
		const ChainLinkAggregator = await ethers.getContractFactory("DemoMockAggregator", owner);
		const chainLinkAggregator = await ChainLinkAggregator.deploy();
		await chainLinkAggregator.deployed();
		await chainLinkAggregator.setDynamicPrice(300);
		console.log("ChainLinkAggregator:" + chainLinkAggregator.address);

		// deploy Token
		const Token = await ethers.getContractFactory("DemoToken");
		const token = await Token.deploy();
		await token.deployed();
		console.log("Token deployed to:", token.address);
		await ico.setTokenAddress(token.address);

		// deploy WBTC
		// https://mumbai.polygonscan.com/address/0x0d787a4a1548f673ed375445535a6c7a1ee56180
		// https://github.com/swaponline/MultiCurrencyWallet/blob/master/docs/FAUCETS.md
		await ico.setPaymentToken("WBTC", '0x0d787a4a1548f673ed375445535a6c7A1EE56180', '0x007A22900a3B98143368Bd5906f8E17e9867581b', Math.floor(DEF_PRICE_BTC_IN_USD * 10**6), 8);
		console.log("WBTC installed");

		// deploy ETH
		// https://mumbai.polygonscan.com/token/0xa6fa4fb5f76172d178d61b04b0ecd319c5d1c0aa
		// https://staging.aave.com/#/faucet
		// https://faucet.paradigm.xyz/
		await ico.setPaymentToken("WETH", '0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa', "0x0715A7794a1dc8e42615F059dD6e406A6594651A", Math.floor(DEF_PRICE_ETH_IN_USD * 10**6), 18);
		console.log("WETH installed");

		// deploy MATIC
		// https://faucet.polygon.technology/
		await ico.setPaymentToken("COIN", ico.address, "0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada", Math.floor(DEF_PRICE_MATIC_IN_USD * 10**6), 18);
		console.log("COIN installed");

		// deploy BNB
		const BNB = await ethers.getContractFactory("FOO");
		const bnb = await BNB.deploy("BNB", "BNB");
		await bnb.deployed();
		await bnb.transfer('0x20caa5fa15c4177cd6946b8041ef40447db27539', ethers.utils.parseUnits("1000000", 18).toString());
		await ico.setPaymentToken("BNB", bnb.address, chainLinkAggregator.address, Math.floor(DEF_PRICE_BNB_IN_USD * 10**6), 18);
		console.log("BNB deployed to:", bnb.address);
		console.log("BNB owner balance: " + await bnb.balanceOf(owner.address));
		console.log("BNB 0x20caa5fa15c4177cd6946b8041ef40447db27539 balance: " + await bnb.balanceOf('0x20caa5fa15c4177cd6946b8041ef40447db27539'));
		console.log("BNB installed");

		// deploy USDT
		// https://mumbai.polygonscan.com/address/0xa02f6adc7926efebbd59fd43a84f4e0c0c91e832
		// https://calibration-faucet.filswan.com/#/dashboard
		await ico.setPaymentToken("USDT", '0xa02f6adc7926efebbd59fd43a84f4e0c0c91e832', '0x92C09849638959196E976289418e5973CC96d645', Math.floor(DEF_PRICE_USDT_IN_USD * 10**6), 6);
		console.log("USDT installed");

	}

	if (hre.network.name == 'polygon') {
		console.log("deploying to polygon");

		// checks for gas because ethersjs has gas hardcoded and this gives transaction underpriced error
		// https://github.com/ethers-io/ethers.js/issues/2828
		// https://github.com/ethers-io/ethers.js/issues/3370
		const gasEstimated = await ico.estimateGas.setPaymentToken("FOOBAR", '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6', '0xDE31F8bFBD8c84b5360CFACCa3539B938dd78ae6', Math.floor(DEF_PRICE_BTC_IN_USD * 10**6), 18);
		console.log("gasEstimated:", gasEstimated);
		const GAS = await calcGas(gasEstimated);
		console.log("gas:", GAS);

		// deploy WBTC
		// https://polygonscan.com/token/0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6
		const tx1 = await ico.setPaymentToken("WBTC", '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6', '0xDE31F8bFBD8c84b5360CFACCa3539B938dd78ae6', Math.floor(DEF_PRICE_BTC_IN_USD * 10**6), 18, GAS);
		await tx1.wait();
		console.log("WBTC installed");

		// deploy ETH
		// https://polygonscan.com/token/0x7ceb23fd6bc0add59e62ac25578270cff1b9f619
		const tx2 = await ico.setPaymentToken("WETH", '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', "0xF9680D99D6C9589e2a93a78A04A279e509205945", Math.floor(DEF_PRICE_ETH_IN_USD * 10**6), 18, GAS);
		await tx2.wait();
		console.log("WETH installed");

		// deploy MATIC
		const tx3 = await ico.setPaymentToken("COIN", ico.address, "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0", Math.floor(DEF_PRICE_MATIC_IN_USD * 10**6), 18, GAS);
		await tx3.wait();
		console.log("COIN installed");

		// deploy BNB
		// https://polygonscan.com/token/0x3BA4c387f786bFEE076A58914F5Bd38d668B42c3
		const tx4 = await ico.setPaymentToken("BNB", '0x3BA4c387f786bFEE076A58914F5Bd38d668B42c3', '0x82a6c4AF830caa6c97bb504425f6A66165C2c26e', Math.floor(DEF_PRICE_BNB_IN_USD * 10**6), 18, GAS);
		await tx4.wait();
		console.log("BNB installed");

		// deploy USDT
		// https://polygonscan.com/token/0xc2132d05d31c914a87c6611c10748aeb04b58e8f
		const tx5 = await ico.setPaymentToken("USDT", '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', '0x0A6513e40db6EB1b165753AD52E80663aeA50545', Math.floor(DEF_PRICE_USDT_IN_USD * 10**6), 18, GAS);
		await tx5.wait();
		console.log("USDT installed");

	}

	// **********************************************************************************************************************************
	// ***************************************************** Configure BSC Tokens *******************************************************
	// **********************************************************************************************************************************
	if (hre.network.name == 'bsc') {

		// deploy WBTC
		// N/A

		// deploy ETH

		// deploy MATIC

		// deploy BNB

		// deploy USDT

	}

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
		await ico.setTokenAddress(token.address);

		// deploy WBTC
		// N/A

		// deploy ETH

		// deploy MATIC

		// deploy BNB

		// deploy USDT

	}

	// **********************************************************************************************************************************
	// ************************************************ Configure Optimism Tokens *******************************************************
	// **********************************************************************************************************************************
	if (hre.network.name == 'optimism') {

		// deploy WBTC
		// N/A

		// deploy ETH

		// deploy MATIC

		// deploy BNB

		// deploy USDT

	}

	if (hre.network.name == 'optimism_goerly') {

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
		await ico.setTokenAddress(token.address);

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


// ****************************************************************************
// ***************************** Helper Functions *****************************
// ****************************************************************************
const sleep = (ms:any) => new Promise(r => setTimeout(r, ms));

function parse(data: number) {
	return ethers.utils.parseUnits(Math.ceil(data) + '', 'gwei');
}

async function calcGas(gasEstimated: any) {
	let gas = {
			gasLimit: gasEstimated, //.mul(110).div(100)
			maxFeePerGas: ethers.BigNumber.from(40000000000),
			maxPriorityFeePerGas: ethers.BigNumber.from(40000000000)
	};
	try {
			const {data} = await axios({
					method: 'get',
					url: 'https://gasstation-mainnet.matic.network/v2'
			});
			gas.maxFeePerGas = parse(data.fast.maxFee);
			gas.maxPriorityFeePerGas = parse(data.fast.maxPriorityFee);
	} catch (error) {

	}
	return gas;
};