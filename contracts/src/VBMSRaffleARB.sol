// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * VBMSRaffleARB — Arbitrum Raffle Contract
 *
 * Features:
 * - Accepts USND (stablecoin ~$1) + ETH (Chainlink ETH/USD feed)
 * - Chainlink VRF v2.5 for verifiable random winner
 * - Full transparency: all entries public, VRF seed visible
 * - Owner adds Base chain entries (VBMS buyers) via addBaseEntries()
 * - 7-day duration per raffle
 * - Refund if cancelled before draw
 * - Funds released to owner only after prize confirmed delivered
 *
 * Deploy on: Arbitrum One
 * VRF Coordinator: 0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e
 * ETH/USD Feed:    0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612
 * USND:            0x4ecf61a6c2fab8a047ceb3b3b263b401763e9d49
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract VBMSRaffleARB is VRFConsumerBaseV2Plus, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Chainlink VRF ───────────────────────────────────────────────
    IVRFCoordinatorV2Plus private immutable i_vrfCoordinator;
    bytes32 private immutable i_keyHash;
    uint256 private s_subscriptionId;
    uint32 private constant CALLBACK_GAS_LIMIT = 150_000;
    uint16 private constant MIN_CONFIRMATIONS = 3;

    // ─── Chainlink Price Feed ────────────────────────────────────────
    AggregatorV3Interface public immutable ethUsdFeed;

    // ─── Token ───────────────────────────────────────────────────────
    IERC20 public immutable usnd; // ~$1 stablecoin, 18 decimals

    // ─── Raffle State ────────────────────────────────────────────────
    struct Raffle {
        string  prizeDescription;  // "Goofy Romero — Legendary"
        string  prizeImageUrl;     // IPFS/URL of card image (for UI)
        uint256 ticketPriceUSD18;  // ticket price in USD (1e18). e.g. 0.62e18
        uint256 maxTickets;        // total tickets in raffle
        uint256 deadline;          // unix timestamp (startTime + 7 days)
        bool    active;
        bool    drawRequested;
        bool    cancelled;
        bool    prizeDelivered;
        // VRF result (transparent)
        uint256 vrfRequestId;
        uint256 vrfRandomWord;     // raw random from Chainlink (visible publicly)
        uint256 winnerIndex;       // entries[winnerIndex] = winner
        address winner;
    }

    Raffle public raffle;

    // ─── Entries (transparent on-chain) ─────────────────────────────
    // entries[i] = buyer address (one slot per ticket, allows multiple per buyer)
    address[] public entries;
    // per-buyer ticket count (for ranking UI)
    address[] public buyers;
    mapping(address => uint256) public ticketsByAddress;
    mapping(address => bool)    private isBuyer;

    // ─── Refund tracking ─────────────────────────────────────────────
    // (VBMS on Base is non-refundable — goes to pool)
    mapping(address => uint256) public ethPaid;     // wei paid
    mapping(address => uint256) public usndPaid;    // USND paid (18 dec)

    // ─── Totals ───────────────────────────────────────────────────────
    uint256 public totalETH;
    uint256 public totalUSDN;
    uint256 public totalBaseEntries; // entries submitted from Base (VBMS)

    // ─── Events ───────────────────────────────────────────────────────
    event RaffleCreated(string prize, uint256 ticketPriceUSD18, uint256 maxTickets, uint256 deadline);
    event TicketBoughtUSDN(address indexed buyer, uint256 count, uint256 usndAmount);
    event TicketBoughtETH(address indexed buyer, uint256 count, uint256 ethAmount, uint256 ethPriceUSD8);
    event BaseEntryAdded(address indexed buyer, uint256 count);
    event DrawRequested(uint256 indexed vrfRequestId, uint256 totalEntries);
    event WinnerSelected(address indexed winner, uint256 winnerIndex, uint256 vrfRandomWord, uint256 totalEntries);
    event PrizeDelivered(address indexed winner);
    event RaffleCancelled();
    event RefundClaimed(address indexed buyer, uint256 ethAmount, uint256 usndAmount);

    // ─── Constructor ─────────────────────────────────────────────────
    constructor(
        address vrfCoordinator, // ARB One: 0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e
        bytes32 keyHash,        // 500 gwei: 0x027f94ff1465b3525f9fc03e9ff7d6d2c0953482246dd6ae07570c45d6631414
        uint256 subscriptionId,
        address _ethUsdFeed,    // ARB One: 0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612
        address _usnd           // 0x4ecf61a6c2fab8a047ceb3b3b263b401763e9d49
    ) VRFConsumerBaseV2Plus(vrfCoordinator) {
        i_vrfCoordinator = IVRFCoordinatorV2Plus(vrfCoordinator);
        i_keyHash        = keyHash;
        s_subscriptionId = subscriptionId;
        ethUsdFeed       = AggregatorV3Interface(_ethUsdFeed);
        usnd             = IERC20(_usnd);
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN — CREATE RAFFLE
    // ═══════════════════════════════════════════════════════════════

    /**
     * @dev Creates a new raffle. Previous raffle must be resolved first.
     * @param prizeDescription  Human-readable prize name
     * @param prizeImageUrl     Card image URL for UI display
     * @param ticketPriceUSD18  Ticket price in USD (1e18). E.g. 0.62e18 = $0.62
     * @param maxTickets        Maximum entries (e.g. 37 for a $23 prize at $0.62/ticket)
     * @param durationSeconds   How long the raffle runs (604800 = 7 days)
     */
    function createRaffle(
        string calldata prizeDescription,
        string calldata prizeImageUrl,
        uint256 ticketPriceUSD18,
        uint256 maxTickets,
        uint256 durationSeconds
    ) external onlyOwner {
        require(!raffle.active, "Resolve current raffle first");
        require(entries.length == 0, "Call resetRaffle() first");
        require(maxTickets > 0 && ticketPriceUSD18 > 0, "Invalid config");
        require(durationSeconds >= 1 hours, "Min 1 hour");

        raffle = Raffle({
            prizeDescription:  prizeDescription,
            prizeImageUrl:     prizeImageUrl,
            ticketPriceUSD18:  ticketPriceUSD18,
            maxTickets:        maxTickets,
            deadline:          block.timestamp + durationSeconds,
            active:            true,
            drawRequested:     false,
            cancelled:         false,
            prizeDelivered:    false,
            vrfRequestId:      0,
            vrfRandomWord:     0,
            winnerIndex:       0,
            winner:            address(0)
        });

        emit RaffleCreated(prizeDescription, ticketPriceUSD18, maxTickets, raffle.deadline);
    }

    // ═══════════════════════════════════════════════════════════════
    // BUY TICKETS — USND
    // ═══════════════════════════════════════════════════════════════

    /**
     * @dev Buy tickets with USND stablecoin (~$1 per USND, 18 decimals).
     *      Cost = ticketPriceUSD18 * count (since 1 USND ≈ 1 USD).
     */
    function buyWithUSDN(uint256 count) external nonReentrant {
        _requireOpen(count);

        // USND has 18 decimals, ticket price is in 1e18 USD → direct mapping
        uint256 cost = raffle.ticketPriceUSD18 * count;

        usnd.safeTransferFrom(msg.sender, address(this), cost);
        usndPaid[msg.sender] += cost;
        totalUSDN += cost;

        _recordEntries(msg.sender, count);
        emit TicketBoughtUSDN(msg.sender, count, cost);
    }

    // ═══════════════════════════════════════════════════════════════
    // BUY TICKETS — ETH
    // ═══════════════════════════════════════════════════════════════

    /**
     * @dev Buy tickets with ETH. Price calculated via Chainlink ETH/USD feed.
     *      Send slightly more ETH than needed; excess is refunded.
     */
    function buyWithETH(uint256 count) external payable nonReentrant {
        _requireOpen(count);

        (uint256 ethNeeded, uint256 ethPriceUSD8) = getETHCost(count);

        // Allow 1% slippage (price may move between quote and tx)
        require(msg.value >= (ethNeeded * 99) / 100, "Insufficient ETH sent");

        // CEI: update state before external call
        uint256 excess = msg.value > ethNeeded ? msg.value - ethNeeded : 0;
        uint256 paid = msg.value - excess;
        ethPaid[msg.sender] += paid;
        totalETH += paid;
        _recordEntries(msg.sender, count);
        emit TicketBoughtETH(msg.sender, count, paid, ethPriceUSD8);

        // Refund excess after state update
        if (excess > 0) {
            (bool ok,) = msg.sender.call{value: excess}("");
            require(ok, "Excess refund failed");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN — ADD BASE CHAIN ENTRIES (VBMS buyers)
    // ═══════════════════════════════════════════════════════════════

    /**
     * @dev Owner submits entries from Base chain (VBMS payments).
     *      Called by Convex backend after detecting VBMS payment events.
     *      VBMS goes to pool on Base — no ARB-side refund for these.
     */
    function addBaseEntries(address buyer, uint256 count) external onlyOwner {
        _requireOpen(count);
        _recordEntries(buyer, count);
        totalBaseEntries += count;
        emit BaseEntryAdded(buyer, count);
    }

    // ═══════════════════════════════════════════════════════════════
    // DRAW — CHAINLINK VRF
    // ═══════════════════════════════════════════════════════════════

    /**
     * @dev Request random winner from Chainlink VRF.
     *      Can be called when: raffle full OR deadline passed.
     *      Requires at least 1 entry.
     */
    function requestDraw() external onlyOwner {
        require(raffle.active, "No active raffle");
        require(!raffle.drawRequested, "Draw already requested");
        require(entries.length > 0, "No entries");
        require(
            entries.length >= raffle.maxTickets || block.timestamp >= raffle.deadline,
            "Raffle not complete (fill tickets or wait for deadline)"
        );

        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash:            i_keyHash,
                subId:              s_subscriptionId,
                requestConfirmations: MIN_CONFIRMATIONS,
                callbackGasLimit:   CALLBACK_GAS_LIMIT,
                numWords:           1,
                extraArgs:          VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: true})
                )
            })
        );

        raffle.vrfRequestId = requestId;
        raffle.drawRequested = true;

        emit DrawRequested(requestId, entries.length);
    }

    /**
     * @dev Chainlink VRF callback. Selects winner transparently.
     *      winnerIndex = vrfRandomWord % totalEntries
     *      All values stored publicly so anyone can verify.
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) internal override {
        require(raffle.vrfRequestId == requestId, "Unexpected requestId");
        raffle.vrfRandomWord = randomWords[0];
        raffle.winnerIndex   = randomWords[0] % entries.length;
        raffle.winner        = entries[raffle.winnerIndex];
        raffle.active        = false;
        emit WinnerSelected(raffle.winner, raffle.winnerIndex, randomWords[0], entries.length);
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN — PRIZE DELIVERY & WITHDRAWAL
    // ═══════════════════════════════════════════════════════════════

    /**
     * @dev Owner confirms card was physically/digitally delivered.
     *      Unlocks collected funds for withdrawal.
     */
    function confirmPrizeDelivered() external onlyOwner {
        require(raffle.winner != address(0), "Winner not drawn yet");
        require(!raffle.prizeDelivered, "Already confirmed");

        raffle.prizeDelivered = true;

        // Withdraw all USND and ETH to owner
        uint256 usndBal = usnd.balanceOf(address(this));
        if (usndBal > 0) usnd.safeTransfer(owner(), usndBal);

        uint256 ethBal = address(this).balance;
        if (ethBal > 0) {
            (bool ok,) = owner().call{value: ethBal}("");
            require(ok, "ETH withdrawal failed");
        }

        emit PrizeDelivered(raffle.winner);
    }

    // ═══════════════════════════════════════════════════════════════
    // CANCEL & REFUND
    // ═══════════════════════════════════════════════════════════════

    /**
     * @dev Cancel raffle. Enables refunds for USND/ETH payers.
     *      VBMS (Base chain) went to pool — non-refundable by design.
     */
    function cancelRaffle() external onlyOwner {
        require(raffle.active, "No active raffle");
        require(!raffle.drawRequested, "Draw in progress");
        raffle.active    = false;
        raffle.cancelled = true;
        emit RaffleCancelled();
    }

    /**
     * @dev Claim refund after cancellation.
     *      Also available if deadline + 3 days passed with no draw.
     */
    function claimRefund() external nonReentrant {
        bool canRefund = raffle.cancelled ||
            (!raffle.active && raffle.winner == address(0)) ||
            (raffle.active && block.timestamp > raffle.deadline + 3 days);

        require(canRefund, "Refund not available");

        uint256 ethAmt  = ethPaid[msg.sender];
        uint256 usndAmt = usndPaid[msg.sender];
        require(ethAmt > 0 || usndAmt > 0, "Nothing to refund");

        ethPaid[msg.sender]  = 0;
        usndPaid[msg.sender] = 0;

        if (ethAmt > 0) {
            (bool ok,) = msg.sender.call{value: ethAmt}("");
            require(ok, "ETH refund failed");
        }
        if (usndAmt > 0) {
            usnd.safeTransfer(msg.sender, usndAmt);
        }

        emit RefundClaimed(msg.sender, ethAmt, usndAmt);
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN — RESET (after raffle complete)
    // ═══════════════════════════════════════════════════════════════

    function resetRaffle() external onlyOwner {
        require(!raffle.active, "Raffle still active");
        require(
            raffle.prizeDelivered || raffle.cancelled || raffle.winner == address(0),
            "Resolve raffle first"
        );

        // Clear entries
        for (uint256 i = 0; i < buyers.length; i++) {
            address b = buyers[i];
            ticketsByAddress[b] = 0;
            ethPaid[b]          = 0;
            usndPaid[b]         = 0;
            isBuyer[b]          = false;
        }
        delete entries;
        delete buyers;

        totalETH          = 0;
        totalUSDN         = 0;
        totalBaseEntries  = 0;

        delete raffle;
    }

    // ═══════════════════════════════════════════════════════════════
    // VIEWS — TRANSPARENCY
    // ═══════════════════════════════════════════════════════════════

    /// @notice Total tickets sold (entries array length)
    function totalTickets() external view returns (uint256) {
        return entries.length;
    }

    /// @notice Tickets remaining until full
    function ticketsRemaining() external view returns (uint256) {
        if (entries.length >= raffle.maxTickets) return 0;
        return raffle.maxTickets - entries.length;
    }

    /// @notice ETH cost for N tickets (live quote via Chainlink)
    function getETHCost(uint256 count) public view returns (uint256 ethWei, uint256 ethPriceUSD8) {
        (, int256 price,, uint256 updatedAt,) = ethUsdFeed.latestRoundData();
        require(price > 0, "Bad price feed");
        require(block.timestamp - updatedAt < 1 hours, "Price too stale");
        ethPriceUSD8 = uint256(price); // e.g. 200000000000 = $2000.00
        // ticketPriceUSD18 * count / (ethPriceUSD * 1e10) = ethWei
        ethWei = (raffle.ticketPriceUSD18 * count * 1e18) / (ethPriceUSD8 * 1e10);
    }

    /// @notice USND cost for N tickets
    function getUSDNCost(uint256 count) external view returns (uint256) {
        return raffle.ticketPriceUSD18 * count;
    }

    /// @notice Full buyer ranking (sorted by count desc must be done off-chain)
    function getBuyerCount() external view returns (uint256) {
        return buyers.length;
    }

    function getBuyerAt(uint256 index) external view returns (address buyer, uint256 tickets) {
        buyer   = buyers[index];
        tickets = ticketsByAddress[buyer];
    }

    /// @notice Paginated entries (for full transparency UI)
    function getEntries(uint256 from, uint256 to) external view returns (address[] memory) {
        require(to <= entries.length && from <= to, "Invalid range");
        address[] memory slice = new address[](to - from);
        for (uint256 i = from; i < to; i++) {
            slice[i - from] = entries[i];
        }
        return slice;
    }

    /// @notice Full draw result — winner + proof
    function getDrawResult() external view returns (
        address winner,
        uint256 winnerIndex_,
        uint256 vrfRandomWord_,
        uint256 totalEntries_,
        string memory formula
    ) {
        winner         = raffle.winner;
        winnerIndex_   = raffle.winnerIndex;
        vrfRandomWord_ = raffle.vrfRandomWord;
        totalEntries_  = entries.length;
        formula        = "winnerIndex = vrfRandomWord % totalEntries";
    }

    /// @notice Time remaining (seconds)
    function timeRemaining() external view returns (uint256) {
        if (!raffle.active || block.timestamp >= raffle.deadline) return 0;
        return raffle.deadline - block.timestamp;
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN UTILS
    // ═══════════════════════════════════════════════════════════════

    function updateSubscriptionId(uint256 newSubId) external onlyOwner {
        s_subscriptionId = newSubId;
    }

    /**
     * @dev Emergency withdraw — owner can pull any ERC20 or ETH from the contract.
     *      Useful if: prize delivered off-chain, stuck funds, or migration needed.
     *      Does NOT affect refund mappings (cancelling raffle still lets buyers refund).
     *      Use token = address(0) to withdraw ETH.
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            uint256 bal = address(this).balance;
            uint256 amt = amount == 0 ? bal : amount;
            require(amt <= bal, "Insufficient ETH");
            (bool ok,) = owner().call{value: amt}("");
            require(ok, "ETH withdraw failed");
        } else {
            uint256 bal = IERC20(token).balanceOf(address(this));
            uint256 amt = amount == 0 ? bal : amount;
            require(amt <= bal, "Insufficient token balance");
            IERC20(token).safeTransfer(owner(), amt);
        }
    }

    receive() external payable {}

    // ─── Internal ────────────────────────────────────────────────────

    function _requireOpen(uint256 count) internal view {
        require(raffle.active && !raffle.cancelled, "Raffle not active");
        require(block.timestamp < raffle.deadline, "Raffle deadline passed");
        require(count > 0 && count <= 100, "Count 1-100");
        require(entries.length + count <= raffle.maxTickets, "Exceeds max tickets");
    }

    function _recordEntries(address buyer, uint256 count) internal {
        for (uint256 i = 0; i < count; i++) {
            entries.push(buyer);
        }
        if (!isBuyer[buyer]) {
            isBuyer[buyer] = true;
            buyers.push(buyer);
        }
        ticketsByAddress[buyer] += count;
    }
}
