// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * Mock VBMS token para testes locais
 */
contract MockVBMS is ERC20 {
    constructor() ERC20("Mock VBMS", "VBMS") {
        // Mint 10 milhões de tokens para quem deployar
        _mint(msg.sender, 10_000_000 * 10**18);
    }

    // Função para dar tokens de teste para qualquer um
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
