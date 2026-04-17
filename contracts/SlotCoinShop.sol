// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * SlotCoinShop — Buy slot coins with ETH or any accepted ERC20
 *
 * - 1 pack = 100,000 VBMS equivalent = 1,000,000 in-game coins
 * - Prices updated by owner to track Wield bonding curve
 * - VBMS deposit: player sends VBMS to VBMSPoolTroll directly (same as baccarat)
 * - ETH/stablecoin: player buys packs here → Convex polls PacksPurchased → credits coins
 *
 * Accepted tokens are managed via addToken/removeToken (owner only)
 * Each token has its own price per pack (in that token's decimals)
 *
 * Base:  ETH + USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913, 6 dec)
 * ARB:   ETH + USDN (0x4ecf61a6c2fab8a047ceb3b3b263b401763e9d49, 6 dec)
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SlotCoinShop is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public dev;
    uint256 public packPriceETH; // in wei
    bool    public active = true;

    // Accepted ERC20 tokens → price per pack in that token's units
    mapping(address => uint256) public tokenPackPrice;
    address[] public acceptedTokens;

    // ─── Events ────────────────────────────────────────────────────────
    event PacksPurchased(
        address indexed buyer,
        uint256 packCount,
        uint256 amountPaid,
        address indexed token   // address(0) = ETH
    );
    event ETHPriceUpdated(uint256 packPriceETH);
    event TokenAdded(address token, uint256 packPrice);
    event TokenRemoved(address token);
    event ShopToggled(bool active);
    event FundsWithdrawn(address token, uint256 amount);

    constructor(
        uint256 _packPriceETH,
        address _dev
    ) Ownable(msg.sender) {
        packPriceETH = _packPriceETH;
        dev          = _dev;
    }

    modifier onlyOwnerOrDev() {
        require(msg.sender == owner() || msg.sender == dev, "Not authorized");
        _;
    }

    // ─── Buy with ETH ──────────────────────────────────────────────────
    function buyWithETH(uint256 packCount) external payable nonReentrant {
        require(active, "Shop closed");
        require(packCount > 0 && packCount <= 100, "1-100 packs");
        uint256 required = packCount * packPriceETH;
        require(msg.value >= required, "Insufficient ETH");
        if (msg.value > required) {
            payable(msg.sender).transfer(msg.value - required);
        }
        emit PacksPurchased(msg.sender, packCount, required, address(0));
    }

    // ─── Buy with ERC20 (USDC, USDN, or any added token) ──────────────
    function buyWithToken(address token, uint256 packCount) external nonReentrant {
        require(active, "Shop closed");
        require(packCount > 0 && packCount <= 100, "1-100 packs");
        uint256 pricePerPack = tokenPackPrice[token];
        require(pricePerPack > 0, "Token not accepted");
        uint256 required = packCount * pricePerPack;
        IERC20(token).safeTransferFrom(msg.sender, address(this), required);
        emit PacksPurchased(msg.sender, packCount, required, token);
    }

    // ─── Admin: manage tokens ──────────────────────────────────────────
    function addToken(address token, uint256 pricePerPack) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(pricePerPack > 0, "Invalid price");
        if (tokenPackPrice[token] == 0) {
            acceptedTokens.push(token);
        }
        tokenPackPrice[token] = pricePerPack;
        emit TokenAdded(token, pricePerPack);
    }

    function removeToken(address token) external onlyOwner {
        tokenPackPrice[token] = 0;
        for (uint i = 0; i < acceptedTokens.length; i++) {
            if (acceptedTokens[i] == token) {
                acceptedTokens[i] = acceptedTokens[acceptedTokens.length - 1];
                acceptedTokens.pop();
                break;
            }
        }
        emit TokenRemoved(token);
    }

    function setETHPrice(uint256 _packPriceETH) external onlyOwner {
        packPriceETH = _packPriceETH;
        emit ETHPriceUpdated(_packPriceETH);
    }

    function setTokenPrice(address token, uint256 pricePerPack) external onlyOwner {
        require(tokenPackPrice[token] > 0, "Token not added");
        tokenPackPrice[token] = pricePerPack;
        emit TokenAdded(token, pricePerPack);
    }

    function setActive(bool _active) external onlyOwner {
        active = _active;
        emit ShopToggled(_active);
    }

    function setDev(address _dev) external onlyOwner {
        dev = _dev;
    }

    // ─── Withdraw any token or ETH ─────────────────────────────────────
    // amount = 0 → withdraw full balance
    function withdrawFunds(address token, uint256 amount) external onlyOwnerOrDev {
        if (token == address(0)) {
            uint256 bal = address(this).balance;
            uint256 out = amount == 0 ? bal : amount;
            require(out <= bal, "Insufficient ETH");
            payable(msg.sender).transfer(out);
            emit FundsWithdrawn(address(0), out);
        } else {
            uint256 bal = IERC20(token).balanceOf(address(this));
            uint256 out = amount == 0 ? bal : amount;
            require(out <= bal, "Insufficient balance");
            IERC20(token).safeTransfer(msg.sender, out);
            emit FundsWithdrawn(token, out);
        }
    }

    // ─── View ──────────────────────────────────────────────────────────
    function getAcceptedTokens() external view returns (address[] memory) {
        return acceptedTokens;
    }

    receive() external payable {}
}
