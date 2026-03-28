// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * VBMSRaffleBase — Base Chain Entry Contract
 *
 * Aceita 3 formas de pagamento para tickets:
 *   1. VBMS  → vai direto para pool (VBMSPoolTroll) — non-refundable
 *   2. ETH   → fica no contrato, owner saca depois
 *   3. USDC  → fica no contrato, owner saca depois
 *
 * Emite TicketPurchased event → Convex detecta → sync para VBMSRaffleARB
 *
 * Deploy on: Base Mainnet
 * VBMS:   0xb03439567cd22f278b21e1ffcdfb8e1696763827  (ERC20 token)
 * Pool:   0x062b914668f3fD35c3Ae02e699cB82e1cF4bE18b
 * USDC:   0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (6 decimals)
 * ETH/USD feed: 0x71041dddad3595F9CEd3dCCFBe3D1F4b0a16Bb70
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface AggregatorV3Interface {
    function latestRoundData() external view returns (
        uint80, int256 price, uint256, uint256 updatedAt, uint80
    );
}

contract VBMSRaffleBase is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Tokens & Pool ───────────────────────────────────────────────
    IERC20  public immutable vbms;
    IERC20  public immutable usdc; // 6 decimals on Base
    address public immutable pool; // VBMSPoolTroll

    // ─── Chainlink ETH/USD (Base) ─────────────────────────────────────
    AggregatorV3Interface public immutable ethUsdFeed;

    // ─── Config ───────────────────────────────────────────────────────
    uint256 public ticketPriceVBMS;  // e.g. 10_000 * 1e18 (10k VBMS ≈ $0.06)
    uint256 public ticketPriceUSD6;  // price in USDC units (6 dec), e.g. 60000 = $0.06
    bool    public active;

    // ─── Tracking ─────────────────────────────────────────────────────
    address[] public buyers;
    mapping(address => uint256) public ticketsByAddress;
    mapping(address => bool)    private isBuyer;
    uint256 public totalTicketsSold;

    // Funds tracking (for owner withdrawal + transparency)
    uint256 public totalETH;
    uint256 public totalUSDC;

    // ─── Events ───────────────────────────────────────────────────────
    // token = VBMS address | USDC address | address(0) for ETH
    event TicketPurchased(
        address indexed buyer,
        uint256 count,
        uint256 amount,    // VBMS (18 dec) | USDC (6 dec) | ETH (wei)
        address token,     // payment token address (address(0) = ETH)
        uint256 indexed raffleEpoch
    );
    event RaffleActivated(uint256 ticketPriceVBMS, uint256 ticketPriceUSD6, uint256 epoch);
    event RaffleDeactivated(uint256 epoch);
    event FundsWithdrawn(address token, uint256 amount);

    uint256 public raffleEpoch;

    // ─── Constructor ──────────────────────────────────────────────────
    constructor(
        address _vbms,
        address _pool,
        address _usdc,
        address _ethUsdFeed
    ) Ownable(msg.sender) {
        vbms       = IERC20(_vbms);
        pool       = _pool;
        usdc       = IERC20(_usdc);
        ethUsdFeed = AggregatorV3Interface(_ethUsdFeed);
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════

    function activateRaffle(
        uint256 _ticketPriceVBMS,
        uint256 _ticketPriceUSD6  // e.g. 60000 = $0.06 USDC
    ) external onlyOwner {
        require(!active, "Already active");
        require(_ticketPriceVBMS > 0 && _ticketPriceUSD6 > 0, "Invalid price");

        for (uint256 i = 0; i < buyers.length; i++) {
            delete ticketsByAddress[buyers[i]];
            delete isBuyer[buyers[i]];
        }
        delete buyers;
        totalTicketsSold = 0;

        ticketPriceVBMS  = _ticketPriceVBMS;
        ticketPriceUSD6  = _ticketPriceUSD6;
        totalETH         = 0;
        totalUSDC        = 0;
        raffleEpoch++;
        active = true;

        emit RaffleActivated(_ticketPriceVBMS, _ticketPriceUSD6, raffleEpoch);
    }

    function deactivateRaffle() external onlyOwner {
        active = false;
        emit RaffleDeactivated(raffleEpoch);
    }

    /// @dev Saca ETH ou ERC20 do contrato para o owner
    function withdrawFunds(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            uint256 bal = address(this).balance;
            uint256 amt = amount == 0 ? bal : amount;
            require(amt <= bal, "Insufficient ETH");
            (bool ok,) = owner().call{value: amt}("");
            require(ok, "ETH withdraw failed");
            emit FundsWithdrawn(address(0), amt);
        } else {
            uint256 bal = IERC20(token).balanceOf(address(this));
            uint256 amt = amount == 0 ? bal : amount;
            require(amt <= bal, "Insufficient balance");
            IERC20(token).safeTransfer(owner(), amt);
            emit FundsWithdrawn(token, amt);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // BUY — VBMS (non-refundable, goes to pool)
    // ═══════════════════════════════════════════════════════════════

    function buyWithVBMS(uint256 count) external nonReentrant {
        _requireActive(count);
        uint256 cost = ticketPriceVBMS * count;
        vbms.safeTransferFrom(msg.sender, pool, cost);
        _record(msg.sender, count);
        emit TicketPurchased(msg.sender, count, cost, address(vbms), raffleEpoch);
    }

    // ─── alias antigo ─────────────────────────────────────────────────
    function buyTickets(uint256 count) external nonReentrant {
        _requireActive(count);
        uint256 cost = ticketPriceVBMS * count;
        vbms.safeTransferFrom(msg.sender, pool, cost);
        _record(msg.sender, count);
        emit TicketPurchased(msg.sender, count, cost, address(vbms), raffleEpoch);
    }

    // ═══════════════════════════════════════════════════════════════
    // BUY — USDC
    // ═══════════════════════════════════════════════════════════════

    function buyWithUSDC(uint256 count) external nonReentrant {
        _requireActive(count);
        uint256 cost = ticketPriceUSD6 * count;
        usdc.safeTransferFrom(msg.sender, address(this), cost);
        totalUSDC += cost;
        _record(msg.sender, count);
        emit TicketPurchased(msg.sender, count, cost, address(usdc), raffleEpoch);
    }

    // ═══════════════════════════════════════════════════════════════
    // BUY — ETH (via Chainlink price feed)
    // ═══════════════════════════════════════════════════════════════

    function buyWithETH(uint256 count) external payable nonReentrant {
        _requireActive(count);

        (uint256 ethNeeded, ) = getETHCost(count);
        require(msg.value >= (ethNeeded * 99) / 100, "Insufficient ETH");

        // Refund excesso
        uint256 excess = msg.value > ethNeeded ? msg.value - ethNeeded : 0;
        uint256 paid   = msg.value - excess;

        if (excess > 0) {
            // Atualiza estado antes do call (CEI pattern)
            totalETH += paid;
            _record(msg.sender, count);
            emit TicketPurchased(msg.sender, count, paid, address(0), raffleEpoch);
            (bool ok,) = msg.sender.call{value: excess}("");
            require(ok, "Refund failed");
        } else {
            totalETH += paid;
            _record(msg.sender, count);
            emit TicketPurchased(msg.sender, count, paid, address(0), raffleEpoch);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // VIEWS
    // ═══════════════════════════════════════════════════════════════

    /// @notice ETH cost for N tickets via Chainlink
    function getETHCost(uint256 count) public view returns (uint256 ethWei, uint256 ethPriceUSD8) {
        (, int256 price,, uint256 updatedAt,) = ethUsdFeed.latestRoundData();
        require(price > 0, "Bad price feed");
        require(block.timestamp - updatedAt < 1 hours, "Price stale");
        ethPriceUSD8 = uint256(price); // e.g. 200000000000 = $2000.00 (8 dec)
        // ticketPriceUSD6 * count * 1e18 / (ethPriceUSD8 * 1e2)
        // porque: USD6 * 1e12 = USD18, ethusd8 * 1e10 = USD18
        ethWei = (uint256(ticketPriceUSD6) * count * 1e12 * 1e18) / (ethPriceUSD8 * 1e10);
    }

    function getBuyerCount() external view returns (uint256) { return buyers.length; }

    function getBuyerAt(uint256 i) external view returns (address buyer, uint256 tickets) {
        buyer   = buyers[i];
        tickets = ticketsByAddress[buyer];
    }

    function getCostVBMS(uint256 count) external view returns (uint256) { return ticketPriceVBMS * count; }
    function getCostUSDC(uint256 count) external view returns (uint256) { return ticketPriceUSD6 * count; }

    // ─── Internal ────────────────────────────────────────────────────
    function _requireActive(uint256 count) internal view {
        require(active, "Raffle not active");
        require(count > 0 && count <= 100, "Count 1-100");
    }

    function _record(address buyer, uint256 count) internal {
        if (!isBuyer[buyer]) { isBuyer[buyer] = true; buyers.push(buyer); }
        ticketsByAddress[buyer] += count;
        totalTicketsSold        += count;
    }

    receive() external payable {}
}
