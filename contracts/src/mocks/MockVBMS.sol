// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockVBMS is ERC20 {
    constructor(address initialHolder) ERC20("Mock VBMS", "VBMS") {
        _mint(initialHolder, 1_000_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
