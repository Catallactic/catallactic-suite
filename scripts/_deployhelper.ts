import { ethers } from "hardhat";
import axios from 'axios';

export const sleep = (ms:any) => new Promise(r => setTimeout(r, ms));

export function parse(data: number) {
	return ethers.utils.parseUnits(Math.ceil(data) + '', 'gwei');
}

export async function calcGas(gasEstimated: any) {
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

// prices
export const DEF_PRICE_BTC_IN_USD = 23000;
export const DEF_PRICE_ETH_IN_USD = 1600;
export const DEF_PRICE_MATIC_IN_USD = 1.2;
export const DEF_PRICE_BNB_IN_USD = 300;
export const DEF_PRICE_USDT_IN_USD = 1;

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
