// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * VBMSRouter V2 - Buy VBMS tokens in a single transaction
 *
 * Flow: ETH → mint Pack → sell Pack → VBMS tokens
 *
 * This contract acts as an intermediary to:
 * 1. Mint a pack with ETH
 * 2. Immediately sell the pack for VBMS tokens
 * 3. Transfer VBMS to the user
 *
 * All in ONE transaction!
 *
 * NOTE: Requires startingTokenId parameter because BoosterDrop is NOT ERC721Enumerable
 * Frontend reads nextTokenId from BoosterDrop storage slot 7
 */

interface IBoosterDrop {
    // Correct signature: mint(uint256,address,address,address) = 0x70c7ff94
    function mint(
        uint256 quantity,
        address recipient,
        address referrer,
        address orderReferrer
    ) external payable;

    function sellAndClaimOffer(
        uint256 tokenId,
        address recipient,
        address referrer
    ) external;

    function getMintPrice(uint256 quantity) external view returns (uint256);
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

contract VBMSRouter is IERC721Receiver {
    // VBMS contracts on Base (checksummed addresses)
    IBoosterDrop public constant BOOSTER_DROP = IBoosterDrop(0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728);
    IERC20 public constant VBMS_TOKEN = IERC20(0xb03439567cD22f278B21e1FFcDFB8E1696763827);

    // Default referrer (your address for fees)
    address public immutable defaultReferrer;

    // Owner for withdrawing stuck funds
    address public owner;

    // Events
    event VBMSPurchased(
        address indexed buyer,
        uint256 quantity,
        uint256 ethSpent,
        uint256 vbmsReceived
    );

    constructor(address _referrer) {
        defaultReferrer = _referrer;
        owner = msg.sender;
    }

    /**
     * Buy VBMS tokens with ETH
     * @param quantity Number of packs to buy (1 pack = ~100k VBMS)
     * @param startingTokenId The next token ID (read from BoosterDrop storage slot 7)
     * @param referrer Optional referrer address (defaults to contract's referrer)
     */
    function buyVBMS(uint256 quantity, uint256 startingTokenId, address referrer) external payable {
        require(quantity > 0, "Must buy at least 1 pack");
        require(msg.value > 0, "Must send ETH");

        address ref = referrer != address(0) ? referrer : defaultReferrer;

        // Get initial VBMS balance
        uint256 initialBalance = VBMS_TOKEN.balanceOf(address(this));

        // Step 1: Mint packs (this contract receives the NFTs)
        BOOSTER_DROP.mint{value: msg.value}(
            quantity,
            address(this), // Mint to this contract
            ref,
            ref  // orderReferrer - same as referrer
        );

        // Step 2: Sell each pack for VBMS using pre-calculated token IDs
        // Token IDs are sequential: startingTokenId, startingTokenId+1, etc.
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = startingTokenId + i;
            BOOSTER_DROP.sellAndClaimOffer(tokenId, address(this), ref);
        }

        // Step 3: Transfer all VBMS to buyer
        uint256 finalBalance = VBMS_TOKEN.balanceOf(address(this));
        uint256 vbmsReceived = finalBalance - initialBalance;

        require(vbmsReceived > 0, "No VBMS received");
        require(VBMS_TOKEN.transfer(msg.sender, vbmsReceived), "VBMS transfer failed");

        emit VBMSPurchased(msg.sender, quantity, msg.value, vbmsReceived);
    }

    /**
     * Get the price for buying X packs
     */
    function getMintPrice(uint256 quantity) external view returns (uint256) {
        return BOOSTER_DROP.getMintPrice(quantity);
    }

    /**
     * Receive NFTs (required for mint to work)
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    }

    /**
     * Withdraw stuck ETH (owner only)
     */
    function withdrawETH() external {
        require(msg.sender == owner, "Not owner");
        payable(owner).transfer(address(this).balance);
    }

    /**
     * Withdraw stuck tokens (owner only)
     */
    function withdrawTokens(address token) external {
        require(msg.sender == owner, "Not owner");
        IERC20(token).transfer(owner, IERC20(token).balanceOf(address(this)));
    }

    /**
     * Receive ETH
     */
    receive() external payable {}
}
