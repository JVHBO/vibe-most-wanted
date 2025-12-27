// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title VBMSClaim
 * @dev Contrato de pool para claims de VBMS tokens
 *
 * Jogadores ganham coins off-chain (Convex backend)
 * Este contrato permite sacar esses coins como tokens VBMS reais
 *
 * Security Features:
 * - Signature verification (backend autoriza cada claim)
 * - Rate limiting (1 claim por hora por jogador)
 * - Nonce system (previne replay attacks)
 * - Pausable (emergency stop)
 * - ReentrancyGuard (previne reentrancy)
 */
contract VBMSClaim is Ownable, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /// @notice Endereço do token VBMS
    IERC20 public immutable vbmsToken;

    /// @notice Endereço autorizado a assinar claims (backend)
    address public signer;

    /// @notice Rate limit: tempo mínimo entre claims (1 hora = 3600 segundos)
    uint256 public constant CLAIM_COOLDOWN = 1 hours;

    /// @notice Minimum claim amount (100 VBMS com 18 decimais)
    uint256 public constant MIN_CLAIM_AMOUNT = 100 * 10**18;

    /// @notice Maximum claim amount por transação (pode ser alterado pelo owner)
    uint256 public maxClaimAmount = 500_000 * 10**18;

    /// @notice 🔒 DAILY CAP: Máximo que um jogador pode claimar por dia
    /// @dev Previne exploits onde jogador drena pool inteira
    /// @dev Owner pode ajustar este valor via setDailyCap()
    uint256 public dailyClaimCap = 10_000 * 10**18; // Default: 10,000 VBMS

    /// @notice Tracking de último claim por jogador
    mapping(address => uint256) public lastClaimTimestamp;

    /// @notice Tracking de nonces usados (previne replay)
    mapping(bytes32 => bool) public usedNonces;

    /// @notice Total de VBMS claimed por jogador (lifetime)
    mapping(address => uint256) public totalClaimed;

    /// @notice Total de VBMS claimed globalmente (lifetime)
    uint256 public globalTotalClaimed;

    /// @notice 🔒 Tracking de claims diários por jogador
    /// @dev Reseta automaticamente a cada dia (tracked por dia UTC)
    mapping(address => mapping(uint256 => uint256)) public dailyClaimedByPlayer;

    /// @notice Helper: retorna o dia atual (timestamp / 1 day)
    function currentDay() public view returns (uint256) {
        return block.timestamp / 1 days;
    }

    /// @notice Emitido quando jogador faz claim
    event Claimed(
        address indexed player,
        uint256 amount,
        bytes32 nonce,
        uint256 timestamp
    );

    /// @notice Emitido quando signer é atualizado
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);

    /// @notice Emitido quando owner retira tokens (emergência)
    event EmergencyWithdraw(address indexed to, uint256 amount);

    /// @notice Emitido quando daily cap é atualizado
    event DailyCapUpdated(uint256 oldCap, uint256 newCap);

    /**
     * @dev Constructor
     * @param _vbmsToken Endereço do token VBMS
     * @param _signer Endereço do backend autorizado a assinar claims
     */
    constructor(
        address _vbmsToken,
        address _signer
    ) Ownable(msg.sender) {
        require(_vbmsToken != address(0), "VBMSClaim: Invalid token address");
        require(_signer != address(0), "VBMSClaim: Invalid signer address");

        vbmsToken = IERC20(_vbmsToken);
        signer = _signer;
    }

    /**
     * @notice Claim VBMS tokens
     * @dev Requer signature válida do backend
     *
     * @param amount Quantidade de VBMS a clamar (com decimais)
     * @param nonce Nonce único gerado pelo backend
     * @param signature Signature do backend (sign(player, amount, nonce))
     */
    function claim(
        uint256 amount,
        bytes32 nonce,
        bytes calldata signature
    ) external nonReentrant whenNotPaused {
        address player = msg.sender;

        // Validações básicas
        require(amount >= MIN_CLAIM_AMOUNT, "VBMSClaim: Amount below minimum");
        require(amount <= MAX_CLAIM_AMOUNT, "VBMSClaim: Amount exceeds maximum");
        require(!usedNonces[nonce], "VBMSClaim: Nonce already used");

        // 🔒 DAILY CAP: Verificar se jogador não excedeu limite diário
        uint256 today = currentDay();
        uint256 claimedToday = dailyClaimedByPlayer[player][today];
        require(
            claimedToday + amount <= dailyClaimCap,
            "VBMSClaim: Daily cap exceeded"
        );

        // Rate limiting
        require(
            block.timestamp >= lastClaimTimestamp[player] + CLAIM_COOLDOWN,
            "VBMSClaim: Cooldown not elapsed"
        );

        // Verificar signature
        bytes32 messageHash = keccak256(abi.encodePacked(player, amount, nonce));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedMessageHash.recover(signature);

        require(recoveredSigner == signer, "VBMSClaim: Invalid signature");

        // Verificar pool tem tokens suficientes
        uint256 poolBalance = vbmsToken.balanceOf(address(this));
        require(poolBalance >= amount, "VBMSClaim: Insufficient pool balance");

        // Marcar nonce como usado
        usedNonces[nonce] = true;

        // Atualizar timestamps e totais
        lastClaimTimestamp[player] = block.timestamp;
        totalClaimed[player] += amount;
        globalTotalClaimed += amount;

        // 🔒 Atualizar claim diário
        dailyClaimedByPlayer[player][today] += amount;

        // Transferir tokens
        bool success = vbmsToken.transfer(player, amount);
        require(success, "VBMSClaim: Transfer failed");

        emit Claimed(player, amount, nonce, block.timestamp);
    }

    /**
     * @notice Verifica se jogador pode fazer claim agora
     * @param player Endereço do jogador
     * @return bool True se pode clamar
     */
    function canClaimNow(address player) external view returns (bool) {
        return block.timestamp >= lastClaimTimestamp[player] + CLAIM_COOLDOWN;
    }

    /**
     * @notice Tempo restante até próximo claim possível
     * @param player Endereço do jogador
     * @return uint256 Segundos restantes (0 se pode clamar agora)
     */
    function timeUntilNextClaim(address player) external view returns (uint256) {
        uint256 nextClaimTime = lastClaimTimestamp[player] + CLAIM_COOLDOWN;
        if (block.timestamp >= nextClaimTime) {
            return 0;
        }
        return nextClaimTime - block.timestamp;
    }

    /**
     * @notice Saldo do pool (VBMS disponíveis)
     * @return uint256 Saldo em VBMS tokens
     */
    function poolBalance() external view returns (uint256) {
        return vbmsToken.balanceOf(address(this));
    }

    /**
     * @notice Atualizar endereço do signer (backend)
     * @dev Apenas owner
     * @param newSigner Novo endereço do signer
     */
    function updateSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "VBMSClaim: Invalid signer");
        address oldSigner = signer;
        signer = newSigner;
        emit SignerUpdated(oldSigner, newSigner);
    }

    /**
     * @notice Pausar claims (emergência)
     * @dev Apenas owner
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Despausar claims
     * @dev Apenas owner
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdraw (apenas owner)
     * @dev Usar apenas em caso de emergência crítica
     * @param to Endereço de destino
     * @param amount Quantidade de tokens
     */
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "VBMSClaim: Invalid address");

        uint256 balance = vbmsToken.balanceOf(address(this));
        require(amount <= balance, "VBMSClaim: Insufficient balance");

        bool success = vbmsToken.transfer(to, amount);
        require(success, "VBMSClaim: Transfer failed");

        emit EmergencyWithdraw(to, amount);
    }

    /**
     * @notice 🔒 Verificar quanto jogador pode ainda claimar hoje
     * @param player Endereço do jogador
     * @return uint256 Quantidade ainda disponível para claim hoje (em VBMS)
     */
    function remainingDailyClaim(address player) external view returns (uint256) {
        uint256 today = currentDay();
        uint256 claimedToday = dailyClaimedByPlayer[player][today];

        if (claimedToday >= dailyClaimCap) {
            return 0;
        }

        return dailyClaimCap - claimedToday;
    }

    /**
     * @notice 🔧 Atualizar daily cap (apenas owner)
     * @dev Permite ajustar limites conforme economia evolui
     * @param newCap Novo cap diário (em wei, com 18 decimais)
     */
    function setDailyCap(uint256 newCap) external onlyOwner {
        require(newCap >= MIN_CLAIM_AMOUNT, "VBMSClaim: Cap below minimum claim");
        require(newCap <= 1_000_000 * 10**18, "VBMSClaim: Cap too high (max 1M)");

        uint256 oldCap = dailyClaimCap;
        dailyClaimCap = newCap;

        emit DailyCapUpdated(oldCap, newCap);
    }

    /**
     * @notice Get claim statistics for a player
     * @param player Address of the player
     * @return lastClaim Last claim timestamp
     * @return total Total VBMS claimed (lifetime)
     * @return canClaim Whether can claim now (cooldown passed)
     * @return cooldown Time until next claim (0 if can claim)
     * @return dailyClaimed Amount claimed today
     * @return dailyRemaining Amount still claimable today
     */
    function getPlayerStats(address player) external view returns (
        uint256 lastClaim,
        uint256 total,
        bool canClaim,
        uint256 cooldown,
        uint256 dailyClaimed,
        uint256 dailyRemaining
    ) {
        lastClaim = lastClaimTimestamp[player];
        total = totalClaimed[player];

        uint256 nextClaimTime = lastClaim + CLAIM_COOLDOWN;
        canClaim = block.timestamp >= nextClaimTime;
        cooldown = canClaim ? 0 : nextClaimTime - block.timestamp;

        // 🔒 Daily cap stats
        uint256 today = currentDay();
        dailyClaimed = dailyClaimedByPlayer[player][today];
        dailyRemaining = dailyClaimed >= dailyClaimCap ? 0 : dailyClaimCap - dailyClaimed;
    }
}
