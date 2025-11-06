// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VBMSToken
 * @dev ERC-20 Token para Vibe Most Wanted
 *
 * Supply: 10,000,000 VBMS
 * Decimals: 18
 *
 * Features:
 * - Mintable apenas pelo owner (VBMSClaim contract)
 * - Burnable (opcional para deflação futura)
 * - Standard ERC-20 compliant
 */
contract VBMSToken is ERC20, Ownable {
    /// @notice Maximum supply de 10 milhões de tokens
    uint256 public constant MAX_SUPPLY = 10_000_000 * 10**18;

    /// @notice Emitido quando tokens são mintados
    event TokensMinted(address indexed to, uint256 amount);

    /// @notice Emitido quando tokens são queimados
    event TokensBurned(address indexed from, uint256 amount);

    /**
     * @dev Constructor - Deploy inicial
     * @param initialOwner Endereço que receberá ownership (será o VBMSClaim contract)
     */
    constructor(address initialOwner) ERC20("Vibe Most Wanted Token", "VBMS") Ownable(initialOwner) {
        // Mint supply inicial para o owner (VBMSClaim contract)
        _mint(initialOwner, MAX_SUPPLY);
        emit TokensMinted(initialOwner, MAX_SUPPLY);
    }

    /**
     * @notice Apenas owner pode fazer mint (emergências ou expansão futura)
     * @dev Esta função está desabilitada porque fazemos mint total no deploy
     * @param to Endereço que receberá os tokens
     * @param amount Quantidade de tokens
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "VBMSToken: Exceeds max supply");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @notice Burn tokens (deflação opcional)
     * @param amount Quantidade de tokens para queimar
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @notice Burn tokens de outro endereço (com approval)
     * @param from Endereço de onde queimar
     * @param amount Quantidade de tokens
     */
    function burnFrom(address from, uint256 amount) external {
        _spendAllowance(from, msg.sender, amount);
        _burn(from, amount);
        emit TokensBurned(from, amount);
    }
}
