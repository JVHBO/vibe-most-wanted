// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * SlotCoinShop v2 — Buy slot coins with ETH or any accepted ERC20
 *
 * - Sells coins in any quantity (min 100 coins per tx)
 * - Prices set per 100 coins in ETH (wei) and per token (token's decimals)
 * - Prices updated by owner to track Wield bonding curve
 * - Event CoinsPurchased → Convex polls → credits coins in-game
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
    uint256 public pricePerHundredETH; // wei per 100 coins
    bool    public active = true;

    // Accepted ERC20 tokens → price per 100 coins in that token's units
    mapping(address => uint256) public tokenPricePer100;
    address[] public acceptedTokens;

    uint256 public constant MIN_COINS = 100;

    // ─── Events ────────────────────────────────────────────────────────
    event CoinsPurchased(
        address indexed buyer,
        uint256 coinAmount,
        uint256 amountPaid,
        address indexed token   // address(0) = ETH
    );
    event ETHPriceUpdated(uint256 pricePerHundredETH);
    event TokenAdded(address token, uint256 pricePer100);
    event TokenRemoved(address token);
    event ShopToggled(bool active);
    event FundsWithdrawn(address token, uint256 amount);

    constructor(uint256 _pricePerHundredETH, address _dev) Ownable(msg.sender) {
        pricePerHundredETH = _pricePerHundredETH;
        dev = _dev;
    }

    modifier onlyOwnerOrDev() {
        require(msg.sender == owner() || msg.sender == dev, "Not authorized");
        _;
    }

    // ─── Buy with ETH ──────────────────────────────────────────────────
    function buyCoins(uint256 coinAmount) external payable nonReentrant {
        require(active, "Shop closed");
        require(coinAmount >= MIN_COINS, "Min 100 coins");
        // Round up to nearest 100
        uint256 hundreds = (coinAmount + 99) / 100;
        uint256 required = hundreds * pricePerHundredETH;
        require(msg.value >= required, "Insufficient ETH");
        if (msg.value > required) {
            payable(msg.sender).transfer(msg.value - required);
        }
        emit CoinsPurchased(msg.sender, hundreds * 100, required, address(0));
    }

    // ─── Buy with ERC20 ────────────────────────────────────────────────
    function buyCoinsWithToken(address token, uint256 coinAmount) external nonReentrant {
        require(active, "Shop closed");
        require(coinAmount >= MIN_COINS, "Min 100 coins");
        uint256 pricePer100 = tokenPricePer100[token];
        require(pricePer100 > 0, "Token not accepted");
        uint256 hundreds = (coinAmount + 99) / 100;
        uint256 required = hundreds * pricePer100;
        IERC20(token).safeTransferFrom(msg.sender, address(this), required);
        emit CoinsPurchased(msg.sender, hundreds * 100, required, token);
    }

    // ─── Admin: manage tokens ──────────────────────────────────────────
    function addToken(address token, uint256 pricePer100) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(pricePer100 > 0, "Invalid price");
        if (tokenPricePer100[token] == 0) {
            acceptedTokens.push(token);
        }
        tokenPricePer100[token] = pricePer100;
        emit TokenAdded(token, pricePer100);
    }

    function removeToken(address token) external onlyOwner {
        tokenPricePer100[token] = 0;
        for (uint i = 0; i < acceptedTokens.length; i++) {
            if (acceptedTokens[i] == token) {
                acceptedTokens[i] = acceptedTokens[acceptedTokens.length - 1];
                acceptedTokens.pop();
                break;
            }
        }
        emit TokenRemoved(token);
    }

    function setETHPrice(uint256 _pricePerHundredETH) external onlyOwner {
        pricePerHundredETH = _pricePerHundredETH;
        emit ETHPriceUpdated(_pricePerHundredETH);
    }

    function setTokenPrice(address token, uint256 pricePer100) external onlyOwner {
        require(tokenPricePer100[token] > 0, "Token not added");
        tokenPricePer100[token] = pricePer100;
        emit TokenAdded(token, pricePer100);
    }

    function setActive(bool _active) external onlyOwner {
        active = _active;
        emit ShopToggled(_active);
    }

    function setDev(address _dev) external onlyOwner {
        dev = _dev;
    }

    // ─── Withdraw any token or ETH ─────────────────────────────────────
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
