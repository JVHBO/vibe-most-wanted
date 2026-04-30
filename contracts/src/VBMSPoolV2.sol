// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title VBMSPoolV2
 * @notice Safer VBMS claim pool for Vibe Most Wanted rewards.
 * @dev Uses EIP-712 signed claims with explicit claim ids, deadlines, claim types,
 *      per-user limits, global outflow limits, blacklist controls, and separated roles.
 */
contract VBMSPoolV2 is AccessControl, Pausable, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    bytes32 public constant CLAIM_SIGNER_ROLE = keccak256("CLAIM_SIGNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant LIMIT_MANAGER_ROLE = keccak256("LIMIT_MANAGER_ROLE");
    bytes32 public constant BLACKLIST_MANAGER_ROLE = keccak256("BLACKLIST_MANAGER_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");

    bytes32 public constant CLAIM_TYPEHASH = keccak256(
        "Claim(address player,uint256 amount,bytes32 claimId,uint8 claimType,uint256 deadline)"
    );

    uint256 public constant BPS_DENOMINATOR = 10_000;

    IERC20 public immutable vbmsToken;

    uint256 public minClaimAmount;
    uint256 public maxClaimAmount;
    uint256 public dailyClaimLimit;
    uint256 public globalDailyOutflowLimit;
    uint256 public maxPoolUtilizationBps;

    mapping(bytes32 => bool) public processedClaimIds;
    mapping(address => bool) public blacklistedAddresses;

    mapping(address => uint256) public dailyClaimedAmount;
    mapping(address => uint256) public lastClaimResetTime;

    uint256 public globalDailyOutflowAmount;
    uint256 public globalDailyOutflowResetTime;

    event VBMSClaimed(
        address indexed player,
        uint256 amount,
        bytes32 indexed claimId,
        uint8 indexed claimType,
        address signer
    );
    event ClaimRejected(address indexed player, bytes32 indexed claimId, uint8 indexed claimType, string reason);
    event ClaimLimitsUpdated(uint256 minClaimAmount, uint256 maxClaimAmount, uint256 dailyClaimLimit);
    event GlobalOutflowLimitUpdated(uint256 globalDailyOutflowLimit);
    event MaxPoolUtilizationUpdated(uint256 maxPoolUtilizationBps);
    event BlacklistStatusChanged(address indexed user, bool isBlacklisted);
    event EmergencyWithdraw(address indexed token, address indexed to, uint256 amount);

    error ZeroAddress();
    error InvalidClaimAmount();
    error ClaimExpired();
    error ClaimAlreadyProcessed();
    error InvalidSignature();
    error InsufficientPoolBalance();
    error DailyLimitExceeded();
    error GlobalOutflowLimitExceeded();
    error AddressBlacklisted();
    error InvalidLimitConfig();
    error InvalidClaimTarget();

    constructor(
        address _vbmsToken,
        address admin,
        address claimSigner,
        address treasury
    ) EIP712("VBMSPoolV2", "1") {
        if (_vbmsToken == address(0) || admin == address(0) || claimSigner == address(0) || treasury == address(0)) {
            revert ZeroAddress();
        }

        vbmsToken = IERC20(_vbmsToken);

        minClaimAmount = 100 * 1e18;
        maxClaimAmount = 200_000 * 1e18;
        dailyClaimLimit = 500_000 * 1e18;
        globalDailyOutflowLimit = 2_000_000 * 1e18;
        maxPoolUtilizationBps = 5_000; // At most 50% of pool balance in one claim.
        globalDailyOutflowResetTime = block.timestamp;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CLAIM_SIGNER_ROLE, claimSigner);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(LIMIT_MANAGER_ROLE, admin);
        _grantRole(BLACKLIST_MANAGER_ROLE, admin);
        _grantRole(TREASURY_ROLE, treasury);
    }

    /**
     * @notice Claim VBMS using a backend-signed EIP-712 claim.
     * @param amount Amount in wei.
     * @param claimId Unique backend id. Cannot be reused.
     * @param claimType Application-level claim type, e.g. slot, roulette, quest, inbox.
     * @param deadline Last timestamp where this signature is valid.
     * @param signature EIP-712 signature from an address with CLAIM_SIGNER_ROLE.
     */
    function claimVBMS(
        uint256 amount,
        bytes32 claimId,
        uint8 claimType,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant whenNotPaused {
        if (blacklistedAddresses[msg.sender]) revert AddressBlacklisted();
        if (amount < minClaimAmount || amount > maxClaimAmount) revert InvalidClaimAmount();
        if (block.timestamp > deadline) revert ClaimExpired();
        if (processedClaimIds[claimId]) revert ClaimAlreadyProcessed();

        _resetUserDailyIfNeeded(msg.sender);
        _resetGlobalDailyIfNeeded();

        if (dailyClaimedAmount[msg.sender] + amount > dailyClaimLimit) {
            revert DailyLimitExceeded();
        }
        if (globalDailyOutflowAmount + amount > globalDailyOutflowLimit) {
            revert GlobalOutflowLimitExceeded();
        }

        uint256 poolBalance = vbmsToken.balanceOf(address(this));
        if (poolBalance < amount) revert InsufficientPoolBalance();
        if (amount > (poolBalance * maxPoolUtilizationBps) / BPS_DENOMINATOR) {
            revert InvalidClaimAmount();
        }

        address signer = _recoverClaimSigner(msg.sender, amount, claimId, claimType, deadline, signature);
        if (!hasRole(CLAIM_SIGNER_ROLE, signer)) revert InvalidSignature();

        processedClaimIds[claimId] = true;
        dailyClaimedAmount[msg.sender] += amount;
        globalDailyOutflowAmount += amount;

        vbmsToken.safeTransfer(msg.sender, amount);

        emit VBMSClaimed(msg.sender, amount, claimId, claimType, signer);
    }

    function recoverClaimSigner(
        address player,
        uint256 amount,
        bytes32 claimId,
        uint8 claimType,
        uint256 deadline,
        bytes calldata signature
    ) external view returns (address) {
        if (player == address(0)) revert InvalidClaimTarget();
        return _recoverClaimSigner(player, amount, claimId, claimType, deadline, signature);
    }

    function getPoolBalance() external view returns (uint256) {
        return vbmsToken.balanceOf(address(this));
    }

    function getDailyClaimInfo(address user) external view returns (uint256 remaining, uint256 resetTime) {
        if (lastClaimResetTime[user] == 0 || block.timestamp >= lastClaimResetTime[user] + 1 days) {
            return (dailyClaimLimit, block.timestamp + 1 days);
        }

        uint256 nextReset = lastClaimResetTime[user] + 1 days;
        uint256 claimed = dailyClaimedAmount[user];
        return (claimed >= dailyClaimLimit ? 0 : dailyClaimLimit - claimed, nextReset);
    }

    function getGlobalOutflowInfo() external view returns (uint256 remaining, uint256 resetTime) {
        if (globalDailyOutflowResetTime == 0 || block.timestamp >= globalDailyOutflowResetTime + 1 days) {
            return (globalDailyOutflowLimit, block.timestamp + 1 days);
        }

        uint256 nextReset = globalDailyOutflowResetTime + 1 days;
        uint256 spent = globalDailyOutflowAmount;
        return (spent >= globalDailyOutflowLimit ? 0 : globalDailyOutflowLimit - spent, nextReset);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function setClaimLimits(uint256 newMin, uint256 newMax, uint256 newDailyLimit) external onlyRole(LIMIT_MANAGER_ROLE) {
        if (newMin == 0 || newMin > newMax || newDailyLimit < newMin) revert InvalidLimitConfig();
        minClaimAmount = newMin;
        maxClaimAmount = newMax;
        dailyClaimLimit = newDailyLimit;
        emit ClaimLimitsUpdated(newMin, newMax, newDailyLimit);
    }

    function setGlobalDailyOutflowLimit(uint256 newLimit) external onlyRole(LIMIT_MANAGER_ROLE) {
        if (newLimit < minClaimAmount) revert InvalidLimitConfig();
        globalDailyOutflowLimit = newLimit;
        emit GlobalOutflowLimitUpdated(newLimit);
    }

    function setMaxPoolUtilizationBps(uint256 newBps) external onlyRole(LIMIT_MANAGER_ROLE) {
        if (newBps == 0 || newBps > BPS_DENOMINATOR) revert InvalidLimitConfig();
        maxPoolUtilizationBps = newBps;
        emit MaxPoolUtilizationUpdated(newBps);
    }

    function setBlacklisted(address user, bool isBlacklisted) external onlyRole(BLACKLIST_MANAGER_ROLE) {
        if (user == address(0)) revert ZeroAddress();
        blacklistedAddresses[user] = isBlacklisted;
        emit BlacklistStatusChanged(user, isBlacklisted);
    }

    function setBlacklistedBatch(address[] calldata users, bool isBlacklisted) external onlyRole(BLACKLIST_MANAGER_ROLE) {
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] == address(0)) revert ZeroAddress();
            blacklistedAddresses[users[i]] = isBlacklisted;
            emit BlacklistStatusChanged(users[i], isBlacklisted);
        }
    }

    /**
     * @notice Emergency withdrawal. Restricted to treasury role and only while paused.
     * @dev Pause first so claims cannot race with emergency operations.
     */
    function emergencyWithdraw(address token, address to, uint256 amount) external whenPaused onlyRole(TREASURY_ROLE) {
        if (token == address(0) || to == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
        emit EmergencyWithdraw(token, to, amount);
    }

    function _recoverClaimSigner(
        address player,
        uint256 amount,
        bytes32 claimId,
        uint8 claimType,
        uint256 deadline,
        bytes calldata signature
    ) internal view returns (address) {
        bytes32 structHash = keccak256(
            abi.encode(CLAIM_TYPEHASH, player, amount, claimId, claimType, deadline)
        );
        return ECDSA.recover(_hashTypedDataV4(structHash), signature);
    }

    function _resetUserDailyIfNeeded(address user) internal {
        if (lastClaimResetTime[user] == 0 || block.timestamp >= lastClaimResetTime[user] + 1 days) {
            dailyClaimedAmount[user] = 0;
            lastClaimResetTime[user] = block.timestamp;
        }
    }

    function _resetGlobalDailyIfNeeded() internal {
        if (globalDailyOutflowResetTime == 0 || block.timestamp >= globalDailyOutflowResetTime + 1 days) {
            globalDailyOutflowAmount = 0;
            globalDailyOutflowResetTime = block.timestamp;
        }
    }
}
