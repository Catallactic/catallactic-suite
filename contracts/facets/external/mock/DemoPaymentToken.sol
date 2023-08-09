/**
 *
 *                 _ _   ______                        _
 *	░██████╗░░█████╗░░██████╗░█████╗░██╗░░░░░██╗░█████╗░██╗░░██╗
 *	██╔════╝░██╔══██╗██╔════╝██╔══██╗██║░░░░░██║██╔══██╗██║░██╔╝
 *	██║░░██╗░███████║╚█████╗░██║░░╚═╝██║░░░░░██║██║░░╚═╝█████═╝░
 *	██║░░╚██╗██╔══██║░╚═══██╗██║░░██╗██║░░░░░██║██║░░██╗██╔═██╗░
 *	╚██████╔╝██║░░██║██████╔╝╚█████╔╝███████╗██║╚█████╔╝██║░╚██╗
 *	░╚═════╝░╚═╝░░╚═╝╚═════╝░░╚════╝░╚══════╝╚═╝░╚════╝░╚═╝░░╚═╝
 *
 * This token is just a plain sample ERC-20 used to test the crowdsale contracts. It represents a generic payemnt token for testnets.
 *
 * *********************************************************************************
 * THIS TOKEN IS NOT TO BE AUDITED. IS ONLY INCLUDED FOR TEST PURPOSES.
 * *********************************************************************************
 * 
 */
// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol"; 
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract FOO is Initializable, ERC20Upgradeable { 

  function initialize() initializer public { 
    __ERC20_init("FOO", "FOO");
    _mint(msg.sender, 21_000_000 * 10**18); 
  } 
} 