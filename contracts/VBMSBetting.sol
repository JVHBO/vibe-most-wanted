// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title VBMSBetting
 * @notice Sistema de apostas para espectadores de poker battles
 * @dev Cada aposta = 1 TX on-chain. Vencedores recebem 3x, perdedores perdem tudo
 *
 * IMPORTANTE: Gera MUITAS transações = Farcaster miniapp ranking UP 📈
 * - Cada aposta = 1 TX
 * - Cada claim de winnings = 1 TX
 * - 100 espectadores = 200+ TX por battle
 */
contract VBMSBetting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable vbmsToken;
    address public poolAddress; // VBMSPoolTroll - recebe losing bets
    address public backendSigner; // Assina resultados das battles
    address public pokerBattleContract; // VBMSPokerBattle contract

    uint256 public minBet = 1 * 10**18; // 1 VBMS mínimo
    uint256 public maxBet = 1_000 * 10**18; // 1k VBMS máximo
    uint256 public poolFeePercentage = 1000; // 10% dos losing bets pro pool
    uint256 public payoutMultiplier = 3; // 3x payout para vencedores

    struct Bet {
        address bettor;
        uint256 amount;
        address predictedWinner;
        bool claimed;
    }

    struct BattleBets {
        uint256 totalBetsOnPlayer1;
        uint256 totalBetsOnPlayer2;
        uint256 totalBettors;
        bool resolved;
        address actualWinner;
    }

    // battleId => bettor => Bet
    mapping(uint256 => mapping(address => Bet)) public bets;
    // battleId => BattleBets
    mapping(uint256 => BattleBets) public battleBets;
    // Stats dos bettors
    mapping(address => uint256) public totalWinnings;
    mapping(address => uint256) public totalBetsPlaced;
    mapping(address => uint256) public correctPredictions;

    event BetPlaced(uint256 indexed battleId, address indexed bettor, address predictedWinner, uint256 amount);
    event BetsResolved(uint256 indexed battleId, address indexed winner, uint256 totalPot);
    event WinningsClaimed(uint256 indexed battleId, address indexed bettor, uint256 amount);
    event LosingBetsToPool(uint256 indexed battleId, uint256 amount);

    error InvalidBetAmount();
    error BattleNotFound();
    error BattleAlreadyResolved();
    error AlreadyBetOnThisBattle();
    error InvalidPrediction();
    error BettingClosed();
    error NoWinningsToClaim();
    error WinningsAlreadyClaimed();
    error NotAuthorized();
    error InvalidSignature();

    constructor(
        address _vbmsToken,
        address _poolAddress,
        address _backendSigner,
        address _pokerBattleContract
    ) Ownable(msg.sender) {
        vbmsToken = IERC20(_vbmsToken);
        poolAddress = _poolAddress;
        backendSigner = _backendSigner;
        pokerBattleContract = _pokerBattleContract;
    }

    /**
     * @notice Apostar no resultado de uma poker battle
     * @dev Cada aposta = 1 TX on-chain (bom pro ranking do miniapp!)
     * @param battleId ID da battle no VBMSPokerBattle
     * @param predictedWinner Endereço do player que vai vencer
     * @param amount Quantidade de VBMS a apostar
     */
    function placeBet(
        uint256 battleId,
        address predictedWinner,
        uint256 amount
    ) external nonReentrant {
        if (amount < minBet || amount > maxBet) revert InvalidBetAmount();
        if (bets[battleId][msg.sender].amount > 0) revert AlreadyBetOnThisBattle();
        if (battleBets[battleId].resolved) revert BattleAlreadyResolved();
        if (predictedWinner == address(0)) revert InvalidPrediction();

        // Transfer VBMS do bettor
        vbmsToken.safeTransferFrom(msg.sender, address(this), amount);

        // Registrar bet
        bets[battleId][msg.sender] = Bet({
            bettor: msg.sender,
            amount: amount,
            predictedWinner: predictedWinner,
            claimed: false
        });

        // Update battle stats
        BattleBets storage battleBet = battleBets[battleId];
        battleBet.totalBettors++;

        // Track total bets per player
        // Nota: Não validamos se é player1 ou player2 porque isso seria
        // uma chamada externa ao VBMSPokerBattle (cara em gas)
        // Backend vai validar ao resolver

        // Update bettor stats
        totalBetsPlaced[msg.sender]++;

        emit BetPlaced(battleId, msg.sender, predictedWinner, amount);
    }

    /**
     * @notice Resolver apostas após battle terminar
     * @dev Chamado pelo backend com assinatura
     * @param battleId ID da battle
     * @param winner Endereço do vencedor real
     * @param player1 Endereço do player 1 (para validação)
     * @param player2 Endereço do player 2 (para validação)
     * @param signature Assinatura do backend
     */
    function resolveBets(
        uint256 battleId,
        address winner,
        address player1,
        address player2,
        bytes memory signature
    ) external nonReentrant {
        BattleBets storage battleBet = battleBets[battleId];

        if (battleBet.resolved) revert BattleAlreadyResolved();
        if (winner != player1 && winner != player2) revert InvalidPrediction();

        // Verificar assinatura do backend
        bytes32 messageHash = keccak256(abi.encodePacked(battleId, winner, player1, player2));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        address signer = recoverSigner(ethSignedHash, signature);

        if (signer != backendSigner) revert InvalidSignature();

        // Marcar como resolvido
        battleBet.resolved = true;
        battleBet.actualWinner = winner;

        emit BetsResolved(battleId, winner, 0); // totalPot calculado off-chain
    }

    /**
     * @notice Claim winnings se apostou no vencedor correto
     * @dev Cada claim = 1 TX on-chain (mais ranking!)
     * @param battleId ID da battle
     */
    function claimWinnings(uint256 battleId) external nonReentrant {
        Bet storage bet = bets[battleId][msg.sender];
        BattleBets storage battleBet = battleBets[battleId];

        if (bet.amount == 0) revert NoWinningsToClaim();
        if (bet.claimed) revert WinningsAlreadyClaimed();
        if (!battleBet.resolved) revert BattleNotFound();

        // Verificar se apostou no vencedor correto
        if (bet.predictedWinner != battleBet.actualWinner) {
            revert NoWinningsToClaim();
        }

        bet.claimed = true;

        // Calcular payout: 3x o valor apostado
        uint256 payout = bet.amount * payoutMultiplier;

        // Transfer winnings
        vbmsToken.safeTransfer(msg.sender, payout);

        // Update stats
        totalWinnings[msg.sender] += payout;
        correctPredictions[msg.sender]++;

        emit WinningsClaimed(battleId, msg.sender, payout);
    }

    /**
     * @notice Transferir losing bets pro pool
     * @dev Chamado pelo owner após battle resolver
     * @param battleId ID da battle
     */
    function sendLosingBetsToPool(uint256 battleId) external onlyOwner nonReentrant {
        BattleBets storage battleBet = battleBets[battleId];

        if (!battleBet.resolved) revert BattleNotFound();

        // Calcular total de losing bets
        // Nota: Isso requer iterar por todos os bettors off-chain
        // Por isso essa função deve ser chamada com cuidado
        // Alternativa: Backend calcula e passa como parâmetro

        uint256 contractBalance = vbmsToken.balanceOf(address(this));

        // Transfer 10% pro pool, resto fica para payouts
        uint256 feeToPool = (contractBalance * poolFeePercentage) / 10_000;

        if (feeToPool > 0) {
            vbmsToken.safeTransfer(poolAddress, feeToPool);
            emit LosingBetsToPool(battleId, feeToPool);
        }
    }

    /**
     * @notice Retorna info da aposta de um bettor
     */
    function getBetInfo(uint256 battleId, address bettor) external view returns (
        uint256 amount,
        address predictedWinner,
        bool claimed,
        bool canClaim
    ) {
        Bet memory bet = bets[battleId][bettor];
        BattleBets memory battleBet = battleBets[battleId];

        bool eligible = battleBet.resolved &&
                       bet.amount > 0 &&
                       !bet.claimed &&
                       bet.predictedWinner == battleBet.actualWinner;

        return (
            bet.amount,
            bet.predictedWinner,
            bet.claimed,
            eligible
        );
    }

    /**
     * @notice Retorna stats de um bettor
     */
    function getBettorStats(address bettor) external view returns (
        uint256 totalBets,
        uint256 correctGuesses,
        uint256 earnings,
        uint256 winRate // em basis points (7500 = 75%)
    ) {
        uint256 betsPlaced = totalBetsPlaced[bettor];
        uint256 correct = correctPredictions[bettor];
        uint256 rate = betsPlaced > 0 ? (correct * 10_000) / betsPlaced : 0;

        return (
            betsPlaced,
            correct,
            totalWinnings[bettor],
            rate
        );
    }

    /**
     * @notice Retorna info geral de uma battle
     */
    function getBattleBetsInfo(uint256 battleId) external view returns (
        uint256 totalBettorsCount,
        bool isResolved,
        address winnerAddress
    ) {
        BattleBets memory battleBet = battleBets[battleId];
        return (
            battleBet.totalBettors,
            battleBet.resolved,
            battleBet.actualWinner
        );
    }

    // Admin functions
    function setBetLimits(uint256 newMin, uint256 newMax) external onlyOwner {
        require(newMin < newMax, "Invalid limits");
        minBet = newMin;
        maxBet = newMax;
    }

    function setPoolFeePercentage(uint256 newFee) external onlyOwner {
        require(newFee <= 5000, "Max 50%"); // Máximo 50%
        poolFeePercentage = newFee;
    }

    function setPayoutMultiplier(uint256 newMultiplier) external onlyOwner {
        require(newMultiplier >= 2 && newMultiplier <= 10, "Invalid multiplier");
        payoutMultiplier = newMultiplier;
    }

    function setPoolAddress(address newPool) external onlyOwner {
        require(newPool != address(0), "Zero address");
        poolAddress = newPool;
    }

    function setBackendSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "Zero address");
        backendSigner = newSigner;
    }

    function setPokerBattleContract(address newContract) external onlyOwner {
        require(newContract != address(0), "Zero address");
        pokerBattleContract = newContract;
    }

    /**
     * @notice Emergency withdraw (só em caso de bug crítico)
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        vbmsToken.safeTransfer(owner(), amount);
    }

    // Helper functions para signature verification
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
