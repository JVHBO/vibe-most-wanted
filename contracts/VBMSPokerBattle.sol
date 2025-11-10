// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title VBMSPokerBattle
 * @notice Gerencia poker battles com stakes em $VBMS
 * @dev Cada partida gera múltiplas transações on-chain para aumentar engagement
 */
contract VBMSPokerBattle is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable vbmsToken;
    address public poolAddress; // VBMSPoolTroll - recebe fees
    address public backendSigner; // Assina resultados das partidas

    uint256 public feePercentage = 500; // 5% (em basis points)
    uint256 public minStake = 1 * 10**18; // 1 VBMS mínimo
    uint256 public maxStake = 10_000 * 10**18; // 10k VBMS máximo
    uint256 public battleIdCounter;

    struct Battle {
        uint256 id;
        address player1;
        address player2;
        uint256 stake;
        uint256 createdAt;
        BattleStatus status;
        address winner;
    }

    enum BattleStatus {
        WAITING,    // Esperando player 2
        ACTIVE,     // Em andamento
        FINISHED,   // Finalizada
        CANCELLED   // Cancelada
    }

    mapping(uint256 => Battle) public battles;
    mapping(address => uint256) public activeBattles; // Player => battleId
    mapping(address => uint256) public totalWins;
    mapping(address => uint256) public totalEarned;

    // Events para tracking on-chain
    event BattleCreated(uint256 indexed battleId, address indexed player1, uint256 stake);
    event BattleJoined(uint256 indexed battleId, address indexed player2);
    event BattleFinished(uint256 indexed battleId, address indexed winner, uint256 winnings);
    event BattleCancelled(uint256 indexed battleId, address indexed player1);
    event WinningsClaimed(uint256 indexed battleId, address indexed winner, uint256 amount);

    error InvalidStakeAmount();
    error BattleNotFound();
    error BattleNotWaiting();
    error BattleNotFinished();
    error AlreadyInBattle();
    error NotBattlePlayer();
    error InvalidSignature();
    error CannotJoinOwnBattle();
    error WinningsAlreadyClaimed();

    constructor(
        address _vbmsToken,
        address _poolAddress,
        address _backendSigner
    ) Ownable(msg.sender) {
        vbmsToken = IERC20(_vbmsToken);
        poolAddress = _poolAddress;
        backendSigner = _backendSigner;
    }

    /**
     * @notice Cria uma nova poker battle
     * @dev Player 1 deposita stake e espera oponente
     * @param stake Quantidade de VBMS a apostar
     */
    function createBattle(uint256 stake) external nonReentrant returns (uint256) {
        if (stake < minStake || stake > maxStake) revert InvalidStakeAmount();
        if (activeBattles[msg.sender] != 0) revert AlreadyInBattle();

        battleIdCounter++;
        uint256 battleId = battleIdCounter;

        // Transfer stake do player 1
        vbmsToken.safeTransferFrom(msg.sender, address(this), stake);

        battles[battleId] = Battle({
            id: battleId,
            player1: msg.sender,
            player2: address(0),
            stake: stake,
            createdAt: block.timestamp,
            status: BattleStatus.WAITING,
            winner: address(0)
        });

        activeBattles[msg.sender] = battleId;

        emit BattleCreated(battleId, msg.sender, stake);

        return battleId;
    }

    /**
     * @notice Entra em uma battle existente
     * @dev Player 2 deposita mesmo stake do player 1
     * @param battleId ID da battle
     */
    function joinBattle(uint256 battleId) external nonReentrant {
        Battle storage battle = battles[battleId];

        if (battle.id == 0) revert BattleNotFound();
        if (battle.status != BattleStatus.WAITING) revert BattleNotWaiting();
        if (battle.player1 == msg.sender) revert CannotJoinOwnBattle();
        if (activeBattles[msg.sender] != 0) revert AlreadyInBattle();

        // Transfer stake do player 2
        vbmsToken.safeTransferFrom(msg.sender, address(this), battle.stake);

        battle.player2 = msg.sender;
        battle.status = BattleStatus.ACTIVE;
        activeBattles[msg.sender] = battleId;

        emit BattleJoined(battleId, msg.sender);
    }

    /**
     * @notice Finaliza battle e determina vencedor
     * @dev Chamado pelo backend após partida terminar
     * @param battleId ID da battle
     * @param winner Endereço do vencedor
     * @param signature Assinatura do backend
     */
    function finishBattle(
        uint256 battleId,
        address winner,
        bytes memory signature
    ) external nonReentrant {
        Battle storage battle = battles[battleId];

        if (battle.id == 0) revert BattleNotFound();
        if (battle.status != BattleStatus.ACTIVE) revert BattleNotWaiting();
        if (winner != battle.player1 && winner != battle.player2) revert NotBattlePlayer();

        // Verificar assinatura do backend
        bytes32 messageHash = keccak256(abi.encodePacked(battleId, winner));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        address signer = recoverSigner(ethSignedHash, signature);

        if (signer != backendSigner) revert InvalidSignature();

        // Calcular winnings
        uint256 totalPot = battle.stake * 2;
        uint256 fee = (totalPot * feePercentage) / 10_000;
        uint256 winnings = totalPot - fee;

        battle.status = BattleStatus.FINISHED;
        battle.winner = winner;

        // Limpar active battles
        delete activeBattles[battle.player1];
        delete activeBattles[battle.player2];

        // Transfer fee pro pool
        if (fee > 0) {
            vbmsToken.safeTransfer(poolAddress, fee);
        }

        // Transfer winnings pro vencedor
        vbmsToken.safeTransfer(winner, winnings);

        // Update stats
        totalWins[winner]++;
        totalEarned[winner] += winnings;

        emit BattleFinished(battleId, winner, winnings);
    }

    /**
     * @notice Cancela battle se ninguém entrar
     * @dev Só pode cancelar se ainda WAITING e passou 10 minutos
     * @param battleId ID da battle
     */
    function cancelBattle(uint256 battleId) external nonReentrant {
        Battle storage battle = battles[battleId];

        if (battle.id == 0) revert BattleNotFound();
        if (battle.player1 != msg.sender) revert NotBattlePlayer();
        if (battle.status != BattleStatus.WAITING) revert BattleNotWaiting();

        // Precisa esperar pelo menos 10 minutos
        require(block.timestamp >= battle.createdAt + 10 minutes, "Must wait 10 minutes");

        battle.status = BattleStatus.CANCELLED;
        delete activeBattles[msg.sender];

        // Devolver stake pro player 1
        vbmsToken.safeTransfer(msg.sender, battle.stake);

        emit BattleCancelled(battleId, msg.sender);
    }

    /**
     * @notice Retorna battles ativas (waiting)
     */
    function getActiveBattles(uint256 limit) external view returns (Battle[] memory) {
        uint256 count = 0;

        // Contar battles WAITING
        for (uint256 i = 1; i <= battleIdCounter && count < limit; i++) {
            if (battles[i].status == BattleStatus.WAITING) {
                count++;
            }
        }

        Battle[] memory activeBattlesList = new Battle[](count);
        uint256 index = 0;

        for (uint256 i = 1; i <= battleIdCounter && index < count; i++) {
            if (battles[i].status == BattleStatus.WAITING) {
                activeBattlesList[index] = battles[i];
                index++;
            }
        }

        return activeBattlesList;
    }

    /**
     * @notice Stats de um jogador
     */
    function getPlayerStats(address player) external view returns (
        uint256 wins,
        uint256 earned,
        uint256 currentBattleId
    ) {
        return (
            totalWins[player],
            totalEarned[player],
            activeBattles[player]
        );
    }

    // Admin functions
    function setFeePercentage(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Max 10%"); // Máximo 10%
        feePercentage = newFee;
    }

    function setStakeLimits(uint256 newMin, uint256 newMax) external onlyOwner {
        require(newMin < newMax, "Invalid limits");
        minStake = newMin;
        maxStake = newMax;
    }

    function setPoolAddress(address newPool) external onlyOwner {
        require(newPool != address(0), "Zero address");
        poolAddress = newPool;
    }

    function setBackendSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "Zero address");
        backendSigner = newSigner;
    }

    // Helper function para recuperar signer
    function recoverSigner(bytes32 ethSignedHash, bytes memory signature) internal pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(signature);
        return ecrecover(ethSignedHash, v, r, s);
    }

    function splitSignature(bytes memory sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Invalid signature length");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }
}
