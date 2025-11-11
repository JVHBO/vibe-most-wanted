// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 *
 *                              👑 THE GIGACHAD VICTORY - PATRON SAINT OF $VBMS 👑
 *
 *                                    ♠️  ♥️  ♣️  ♦️  VIBE MOST WANTED  ♦️  ♣️  ♥️  ♠️
 *        ┌───────────────────────────────────────────────────────────────────────────────┐
 *        │                                                                               │
 *        │   This contract is your ticket to either:                                     │
 *        │   1. Becoming a GIGACHAD with fat $VBMS stacks 💰                             │
 *        │   2. Getting absolutely REKT and losing it all 💀                             │
 *        │                                                                               │
 *        │   There is no in-between. This is the way.                                    │
 *        │                                                                               │
 *        │   ⚠️  WARNING: Not responsible for:                                           │
 *        │      - Your bad poker decisions                                               │
 *        │      - Rage quits after getting bluffed                                       │
 *        │      - Addiction to claiming $VBMS                                            │
 *        │      - Spending 3 hours analyzing ASCII art instead of playing                │
 *        │                                                                               │
 *        └───────────────────────────────────────────────────────────────────────────────┘
 *
 *        🃏 THE RULES (lol who reads these anyway?) 🃏
 *
 *        • Win games? Get coins! 💸
 *        • Lose games? Get REKT! 💀
 *        • Claim $VBMS? Hell yeah! 🚀
 *        • Try to hack this? ngmi fren 🛡️
 *
 *        ────────────────────────────────────────────────────────────────────────────────
 *
 *                                    💎 TOKEN ECONOMICS 💎
 *
 *                             Pool Balance: "Enough to make you rich"
 *                              Your Balance: "Probably zero lmao"
 *
 *        ────────────────────────────────────────────────────────────────────────────────
 *
 *                              🎭 BASED CONTRIBUTORS HALL OF FAME 🎭
 *
 *                                    👑 jvhbo - Big Boss
 *                                    🤖 Claude Code - Code Monkey
 *                                    🃏 Base Chain - Where magic happens
 *
 *        ────────────────────────────────────────────────────────────────────────────────
 *
 *                                    ⚡ FUN FACTS ⚡
 *
 *        • If you're reading this in Etherscan, you're a true degen
 *        • The house always wins (just kidding... or am I?)
 *        • $VBMS to the moon? Always has been 🌙
 *        • Your mom called, she wants you to stop gambling
 *
 *        ────────────────────────────────────────────────────────────────────────────────
 *
 *                        🚀 Deployed on Base because we're BASED 🚀
 *
 *                              Contract Version: 1.0.0 
 *                              Audit Status: Trust me bro ™
 *                              Rug Pull Risk: 0% (We built different)
 *
 *        ────────────────────────────────────────────────────────────────────────────────
 *
 *              NOW STOP READING AND GO CLAIM YOUR $VBMS YOU BEAUTIFUL DEGEN!
 *
 *                                         wen moon ser? 🚀🌙
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title VBMSPoolTroll
 * @author The Degen Squad (zoboomafoohbo & Claude)
 * @notice This contract manages the $VBMS token pool for Victory Poker
 * @dev Actually secure despite all the trolling (trust me bro)
 *
 * ⚠️ IMPORTANT: This contract is like your ex - looks fun but handles your money ⚠️
 */
contract VBMSPoolTroll is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // ═══════════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES (The Important Stuff)
    // ═══════════════════════════════════════════════════════════════════════════════

    /// @notice The one and only $VBMS token (address: 0xb03439567cd22f278b21e1ffcdfb8e1696763827)
    IERC20 public immutable vbmsToken;

    /// @notice Backend signer (the one who signs stuff, duh)
    address public backendSigner;

    /// @notice Mapping to track used nonces (prevent replay attacks like a boss)
    mapping(bytes32 => bool) public usedNonces;

    /// @notice Minimum claim amount
    uint256 public minClaimAmount = 1 * 10**18; // 1 VBMS minimum

    /// @notice Maximum claim amount (anti-whale protection)
    uint256 public maxClaimAmount = 100_000 * 10**18; // 100k VBMS max (nice try whale)

    /// @notice Daily claim limit per user (24 hours)
    uint256 public dailyClaimLimit = 100_000 * 10**18; // 100k VBMS per day

    /// @notice Track daily claims per user
    mapping(address => uint256) public dailyClaimedAmount;
    mapping(address => uint256) public lastClaimResetTime;

    // ═══════════════════════════════════════════════════════════════════════════════
    // EVENTS (For when stuff happens)
    // ═══════════════════════════════════════════════════════════════════════════════

    /// @notice Emitted when someone claims $VBMS (cha-ching!)
    event VBMSClaimed(
        address indexed player,
        uint256 amount,
        bytes32 nonce
    );

    /// @notice Emitted when someone gets rekt trying to claim twice with same nonce
    event RektAttempt(address indexed player, bytes32 nonce);

    /// @notice Emitted when backend signer changes (big deal)
    event BackendSignerUpdated(address indexed oldSigner, address indexed newSigner);

    /// @notice Emitted when owner withdraws tokens (for emergencies only, promise)
    event EmergencyWithdraw(address indexed token, uint256 amount);

    // ═══════════════════════════════════════════════════════════════════════════════
    // CUSTOM ERRORS (Gas efficient AND based)
    // ═══════════════════════════════════════════════════════════════════════════════

    /// @notice You're too poor to claim (or too rich)
    error InvalidClaimAmount();

    /// @notice Nice try using the same signature twice
    error NonceAlreadyUsed();

    /// @notice Your signature is faker than your Rolex
    error InvalidSignature();

    /// @notice Pool is empty (everyone panic!)
    error InsufficientPoolBalance();

    /// @notice Zero address? Really bro?
    error ZeroAddress();

    /// @notice You hit your daily claim limit (come back tomorrow)
    error DailyLimitExceeded();

    // ═══════════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR (Where the magic begins)
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Constructs the most based pool contract on Base
     * @param _vbmsToken Address of $VBMS token (the good stuff)
     * @param _backendSigner Address that signs claim requests (the gatekeeper)
     */
    constructor(
        address _vbmsToken,
        address _backendSigner
    ) Ownable(msg.sender) {
        if (_vbmsToken == address(0) || _backendSigner == address(0)) {
            revert ZeroAddress();
        }

        vbmsToken = IERC20(_vbmsToken);
        backendSigner = _backendSigner;

        // 🎊 Pool deployed successfully! Now go claim some $VBMS! 🎊
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // CLAIM FUNCTIONS (The reason you're here)
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Claim your $VBMS tokens from the pool
     * @dev Validates signature, checks nonce, transfers tokens
     * @param amount Amount to claim
     * @param nonce Unique identifier (don't reuse or you'll get REKT)
     * @param signature Backend signature (trust me bro)
     */
    function claimVBMS(
        uint256 amount,
        bytes32 nonce,
        bytes memory signature
    ) external nonReentrant {
        // Check if claims are paused
        require(!claimsPaused, "Claims are currently paused");

        // Check if user is blacklisted
        require(!blacklistedAddresses[msg.sender], "Address is blacklisted");

        // Check amount limits
        if (amount < minClaimAmount || amount > maxClaimAmount) {
            revert InvalidClaimAmount();
        }

        // Check daily limit (reset if it's a new day or first-time user)
        if (lastClaimResetTime[msg.sender] == 0 || block.timestamp >= lastClaimResetTime[msg.sender] + 1 days) {
            // Reset daily counter (new day or first claim)
            dailyClaimedAmount[msg.sender] = 0;
            lastClaimResetTime[msg.sender] = block.timestamp;
        }

        // Check if adding this claim would exceed daily limit
        if (dailyClaimedAmount[msg.sender] + amount > dailyClaimLimit) {
            revert DailyLimitExceeded();
        }

        if (usedNonces[nonce]) {
            emit RektAttempt(msg.sender, nonce);
            revert NonceAlreadyUsed();
        }

        // Verify backend signature
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, amount, nonce));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        address signer = recoverSigner(ethSignedHash, signature);

        if (signer != backendSigner) {
            revert InvalidSignature();
        }

        // Check pool balance
        uint256 poolBalance = vbmsToken.balanceOf(address(this));
        if (poolBalance < amount) {
            revert InsufficientPoolBalance();
        }

        // Mark nonce as used
        usedNonces[nonce] = true;

        // Update daily claimed amount
        dailyClaimedAmount[msg.sender] += amount;

        // Transfer tokens
        vbmsToken.safeTransfer(msg.sender, amount);

        // Emit event
        emit VBMSClaimed(msg.sender, amount, nonce);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS (For the curious ones)
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get current pool balance (how much money is in the pot)
     * @return Current $VBMS balance in the pool
     */
    function getPoolBalance() external view returns (uint256) {
        return vbmsToken.balanceOf(address(this));
    }

    /**
     * @notice Get remaining daily claim allowance for a user
     * @param user Address to check
     * @return remaining Amount user can still claim today
     * @return resetTime When the daily limit resets
     */
    function getDailyClaimInfo(address user) external view returns (uint256 remaining, uint256 resetTime) {
        // First-time user - full daily limit available
        if (lastClaimResetTime[user] == 0) {
            return (dailyClaimLimit, block.timestamp + 1 days);
        }

        uint256 nextResetTime = lastClaimResetTime[user] + 1 days;

        // If time has passed, they have full daily limit available
        if (block.timestamp >= nextResetTime) {
            return (dailyClaimLimit, block.timestamp + 1 days);
        }

        // Calculate remaining amount for today
        uint256 claimed = dailyClaimedAmount[user];
        uint256 remainingAmount = claimed >= dailyClaimLimit ? 0 : dailyClaimLimit - claimed;

        return (remainingAmount, nextResetTime);
    }


    // ═══════════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS (Owner only, for when stuff goes wrong)
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Update backend signer (big responsibility)
     * @param newSigner New signer address
     */
    function setBackendSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();

        address oldSigner = backendSigner;
        backendSigner = newSigner;

        emit BackendSignerUpdated(oldSigner, newSigner);
    }

    /**
     * @notice Update claim limits (min/max)
     * @param newMin New minimum claim amount
     * @param newMax New maximum claim amount
     */
    function setClaimLimits(uint256 newMin, uint256 newMax) external onlyOwner {
        require(newMin < newMax, "Min must be less than max");
        minClaimAmount = newMin;
        maxClaimAmount = newMax;
    }

    /**
     * @notice Update daily claim limit
     * @param newLimit New daily limit per user
     */
    function setDailyClaimLimit(uint256 newLimit) external onlyOwner {
        require(newLimit >= minClaimAmount, "Daily limit must be >= min claim");
        dailyClaimLimit = newLimit;
    }


    /**
     * @notice Emergency withdraw (for when stuff hits the fan)
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     *
     * ⚠️ USE WITH CAUTION - This is for emergencies only! ⚠️
     */
    function emergencyWithdraw(
        address token,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
        emit EmergencyWithdraw(token, amount);
    }

    /**
     * @notice Pause claims (when you need to fix something)
     * @dev Toggle pause state
     *
     * 🛑 USE THIS TO STOP CLAIMS IF SOMETHING GOES WRONG 🛑
     */
    bool public claimsPaused = false;

    function toggleClaimsPause() external onlyOwner {
        claimsPaused = !claimsPaused;
        emit ClaimsPauseToggled(claimsPaused);
    }

    event ClaimsPauseToggled(bool isPaused);


    /// @notice Blacklist mapping - true = banned from claiming
    mapping(address => bool) public blacklistedAddresses;

    /**
     * @notice Whitelist/blacklist addresses from claiming
     * @param user Address to manage
     * @param isBlacklisted True to blacklist, false to whitelist
     *
     * ⛔ BAN HAMMER - Block bad actors ⛔
     */

    function setBlacklisted(address user, bool isBlacklisted) external onlyOwner {
        blacklistedAddresses[user] = isBlacklisted;
        emit BlacklistStatusChanged(user, isBlacklisted);
    }

    event BlacklistStatusChanged(address indexed user, bool isBlacklisted);

    /**
     * @notice Fund the pool with more $VBMS
     * @dev NOT NEEDED - Just send tokens directly to contract address!
     *
     * 💰 PRO TIP: Use vbmsToken.transfer(contractAddress, amount) instead 💰
     *
     * This function removed to save gas and reduce attack surface
     */

    // ═══════════════════════════════════════════════════════════════════════════════
    // HELPER FUNCTIONS (Internal signature verification)
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Recover signer from signature
     * @param ethSignedHash The hash that was signed
     * @param signature The signature bytes
     * @return The address that signed the message
     */
    function recoverSigner(bytes32 ethSignedHash, bytes memory signature) internal pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(signature);
        return ecrecover(ethSignedHash, v, r, s);
    }

    /**
     * @notice Split signature into r, s, v components
     * @param sig The signature bytes
     * @return r The r component
     * @return s The s component
     * @return v The v component
     */
    function splitSignature(bytes memory sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Invalid signature length");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // FINAL WORDS OF WISDOM
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     *
     *                              🎰 DEGEN CHECKLIST 🎰
     *
     *        ✅ Laughed at the troll comments
     *        ✅ Understood the code (or pretended to)
     *        ✅ Ready to claim $VBMS
     *        ✅ Already thinking about next claim
     *        ✅ Added contract to your watchlist
     *        ✅ Confirmed you're a true degen
     *
     *                        NOW GO FORTH AND CLAIM, ANON! 🚀
     *
     *                              wen moon? always has been 🌙
     *
     */
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════════
 *
 *                                  📜 DISCLAIMER 📜
 *
 *    This contract is provided "as is" without warranty of any kind. The developers,
 *    deployers, and contributors are not responsible for:
 *
 *    • Your degen behavior
 *    • Losses from bad poker plays
 *    • Addiction to claiming $VBMS
 *    • Your significant other leaving you because you won't stop playing
 *    • Missed sleep from grinding
 *    • Carpal tunnel from too many clicks
 *    • FOMO from not claiming enough
 *    • Bragging to friends and getting roasted
 *    • Any financial decisions made while under the influence of hopium
 *
 *                            PLAY RESPONSIBLY, DEGEN RESPONSIBLY
 *
 *                                      GM ☀️
 *
 * ═══════════════════════════════════════════════════════════════════════════════════
 */
