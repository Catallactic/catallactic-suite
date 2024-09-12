import * as dotenv from "dotenv";
require('dotenv').config()
//console.log(process.env) // remove this after you've confirmed it is working

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "hardhat-gas-reporter";

dotenv.config();

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
	const accounts = await hre.ethers.getSigners();

	for (const account of accounts) {
		console.log(account.address);
	}
});

const config: HardhatUserConfig = {
	solidity: {
		version: "0.8.18",
		settings: {
			metadata: {
				bytecodeHash: "none",
			},
			optimizer: {
				enabled: true,
				runs: 200
			}
		}
	},
	networks: {

		localhost: {
			chainId: 31337, 																																// We set 1337 to make interacting with MetaMask simpler
      url: "http://127.0.0.1:8545",
      gas: 12000000,
      blockGasLimit: 12000000,
		},

		// *********************************************************************************************************************************************
		// *************************************************************** ethereum ********************************************************************
		// *********************************************************************************************************************************************
		mainnet: {
			url: "https://mainnet.infura.io/v3/" + process.env.INFURA_ID, 									// mainnet url with projectId
			accounts: [process.env.PRIVATE_KEY_336A!], 																			// account that deploys
		},
		sepolia: {
			url: "https://sepolia.infura.io/v3/" + process.env.INFURA_ID,										//sepolia url with projectId
			accounts: [process.env.PRIVATE_KEY_336A!], 																			// account that deploys
		},
		goerly: {
			url: "https://goerli.infura.io/v3/" + process.env.INFURA_ID,	 									//goerly url with projectId
			accounts: [process.env.PRIVATE_KEY_336A!],																			// account that deploys
		},

		// *********************************************************************************************************************************************
		// "https://blog.infura.io/post/deprecation-timeline-for-rinkeby-ropsten-and-kovan-testnets
		// "message":"Network decommissioned, please use Goerli or Sepolia instead",
		// "code":-32601,
		/*ropsten: { // deprecated in 2022 - 
			url: "https://ropsten.infura.io/v3/" + process.env.INFURA_ID, 									// Infura url with projectId
			accounts: [process.env.PRIVATE_KEY_336A!],																		 	// account that deploys
		},
		rinkeby: { // deprecated in 2022
			url: "https://rinkeby.infura.io/v3/" + process.env.INFURA_ID, 									// rinkeby url with projectId
			accounts: [process.env.PRIVATE_KEY_336A!],																		 	// account that deploys
		},
		kovan: { // deprecated in 2019
			url: "https://kovan.infura.io/v3/" + process.env.INFURA_ID, 										//kovan url with projectId
			accounts: [process.env.PRIVATE_KEY_336A!],																		 	// account that deploys
		},*/

		// *********************************************************************************************************************************************
		// **************************************************************** Polygon ********************************************************************
		// *********************************************************************************************************************************************
		polygon: {
			// RPC URL
			// https://chainlist.org/chain/137
			//url: "https://rpc-mainnet.matic.network",
			//url: "https://polygonscan.com/myapikey",
			//url: "https://rpc-mainnet.maticvigil.com",
			url: "https://polygon-rpc.com",																									// https://polygon-rpc.com/
			//url: "",																																			// Infura
			//url: "",																																			// Moralis Speedy Nodes
			//url: "",																																			// QuickNode
			accounts: [process.env.PRIVATE_KEY_336A!],
		},
		polygon_mumbai: {
			url: "https://rpc-mumbai.maticvigil.com",																
			accounts: [process.env.PRIVATE_KEY_336A!],																			// account that deploys
		},

		// *********************************************************************************************************************************************
		// ****************************************************************** BSC **********************************************************************
		// *********************************************************************************************************************************************
		bscmainnet: {
			url: "https://bsc-dataseed.binance.org/",
			chainId: 56,
			gasPrice: 20000000000,
			accounts: {mnemonic: process.env.MNEMONIC!}
		},
		bsctestnet: {
			url: "https://data-seed-prebsc-1-s1.binance.org:8545",
			chainId: 97,
			gasPrice: 20000000000,
			accounts: {mnemonic: process.env.MNEMONIC!}
		},

		// *********************************************************************************************************************************************
		// ****************************************************************** Rootstock ****************************************************************
		// *********************************************************************************************************************************************
		rootstock: {
			url: "https://public-node.rsk.co",
			chainId: 30,
			gasPrice: 20000000000,
			accounts: [process.env.PRIVATE_KEY_336A!]
		},
		rootstock_testnet: {
      url: 'https://public-node.testnet.rsk.co/',
			//url: "https://rpc.testnet.rootstock.io/json-rpc/" + process.env.ROOTSTOCK_TEST_API_KEY,
			chainId: 31,
			//gasPrice: 200000000000,
			accounts: [process.env.PRIVATE_KEY_336A!]
		},

		// *********************************************************************************************************************************************
		// ****************************************************************** Bitfinity ****************************************************************
		// *********************************************************************************************************************************************
    bitfinity_testnet: {
      url: "https://testnet-rpc.bitlayer.org",
			chainId: 200810,
			gasPrice: 100000000,
			accounts: [process.env.PRIVATE_KEY_336A!]
    },

		// *********************************************************************************************************************************************
		// ****************************************************************** Bitlayer *****************************************************************
		// *********************************************************************************************************************************************
    bitlayer_testnet: {
      url: "https://testnet-rpc.bitlayer.org",
			chainId: 200810,
			gasPrice: 100000000,
			accounts: [process.env.PRIVATE_KEY_336A!]
    },

		// *********************************************************************************************************************************************
		// ****************************************************************** B2 Network ***************************************************************
		// *********************************************************************************************************************************************
		b2Testnet: {
			url: `https://zkevm-rpc.bsquared.network`,
			chainId: 1102,
			accounts: [process.env.PRIVATE_KEY_336A!]
		},

		// *********************************************************************************************************************************************
		// ****************************************************************** Merlin *******************************************************************
		// *********************************************************************************************************************************************
    merlin_testnet: {
			url: `https://testnet-rpc.merlinchain.io`,
			accounts: [process.env.PRIVATE_KEY_336A!]
		},

		// *********************************************************************************************************************************************
		// ****************************************************************** Citrea *******************************************************************
		// *********************************************************************************************************************************************
    citrea_devnet: {
			url: "https://rpc.devnet.citrea.xyz",
			chainId: 62298,
			gasPrice: 10000000000,
			accounts: [process.env.PRIVATE_KEY_336A!]
		},

	},
	etherscan: {
		apiKey: process.env.POLYGONSCAN_API_KEY,
	},
	gasReporter: {
		//enabled: process.env.REPORT_GAS !== undefined,
		enabled: true,
		currency: "USD",
		//showMethodSig: true,
		showTimeSpent:true,
		coinmarketcap: process.env.CMC_ID,
		// gasPriceApi: 'https://api.etherscan.io/api?module=proxy&action=eth_gasPrice',		// ethereum
		// token: 'ETH'
		// gasPriceApi: 'https://api.bscscan.com/api?module=proxy&action=eth_gasPrice',			// BSC
		// token: 'BNB'
		gasPriceApi: 'https://api.polygonscan.com/api?module=proxy&action=eth_gasPrice',		// polygon
		token: 'MATIC'
	},
};

export default config;
