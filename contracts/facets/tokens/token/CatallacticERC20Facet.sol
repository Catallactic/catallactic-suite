/**
 *
 *                 _ _   ______                        _
 *
 * This token is just a plain sample ERC-20 used to test the crowdsale contracts. Whereas we do not expect the final CYGAS been too different to this basic 
 * ERC-20 token, this is not the final CYGAS source code. 
 * 
 * Some things to add will be:
 *  - 3% taxes to address velocity of circulation and fund the project
 * 
 * The final features are still under discussion but, be aware that, we want to capture the natural value of the underlaying asset as more faithfully as we can 
 * and, therefore, we do not need and we do not want fancy financial artifacts eg. pool manipulations and liquifications incorporated into CYGAS. The closest 
 * to a gold standard backed by gas, the better.
 * 
 * *********************************************************************************
 * THIS TOKEN IS NOT TO BE AUDITED. IS ONLY INCLUDED FOR TEST PURPOSES.
 * *********************************************************************************
 * 
 */
// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CatallacticERC20Facet is Ownable, ERC20 {
    constructor() ERC20("CryptoGas", "CYGAS") {
        _mint(msg.sender, 200_000_000 * 10**18);
    }
}