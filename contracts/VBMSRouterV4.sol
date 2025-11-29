// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * VBMSRouter V4 - Race-condition proof VBMS purchasing
 *
 * PROBLEM SOLVED:
 * V3 used pre-calculated startingTokenId which fails when another tx mints first.
 * V4 captures ACTUAL minted tokenIds via onERC721Received callback.
 *
 * Flow: ETH -> mint Pack -> (callback captures tokenId) -> sell Pack -> VBMS to user
 */

interface IBoosterDrop {
    function mint(
        uint256 quantity,
        address recipient,
        address referrer,
        string calldata comment
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

contract VBMSRouterV4 is IERC721Receiver {
    // VBMS Token address
    IERC20 public constant VBMS_TOKEN = IERC20(0xb03439567cD22f278B21e1FFcDFB8E1696763827);

    // Default VBMS BoosterDrop
    address public constant VBMS_BOOSTER_DROP = 0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728;

    // Default referrer for fees
    address public immutable defaultReferrer;

    // Owner for emergency withdrawals
    address public owner;

    // ============================================
    // RACE-CONDITION FIX: Capture minted tokenIds
    // ============================================
    // Temporary storage for tokenIds received during mint
    // These are populated by onERC721Received callback
    uint256[] private _receivedTokenIds;

    // Flag to track if we're in a buy operation
    bool private _inBuyOperation;

    // Events
    event VBMSPurchased(
        address indexed buyer,
        address indexed boosterDrop,
        uint256 quantity,
        uint256 ethSpent,
        uint256 vbmsReceived,
        uint256[] tokenIds
    );

    constructor(address _referrer) {
        defaultReferrer = _referrer;
        owner = msg.sender;
    }

    /**
     * Buy VBMS tokens with ETH - RACE-CONDITION PROOF
     *
     * @param boosterDrop - The BoosterDrop contract address
     * @param quantity - Number of packs to buy (1 pack = ~100k VBMS)
     *
     * NOTE: No startingTokenId parameter needed! We capture actual tokenIds.
     */
    function buy(
        address boosterDrop,
        uint256 quantity
    ) external payable {
        require(quantity > 0, "Must buy at least 1");
        require(msg.value > 0, "Must send ETH");
        require(boosterDrop != address(0), "Invalid boosterDrop");
        require(!_inBuyOperation, "Reentrant call");

        // Set flag and clear previous tokenIds
        _inBuyOperation = true;
        delete _receivedTokenIds;

        IBoosterDrop drop = IBoosterDrop(boosterDrop);

        // Get initial VBMS balance
        uint256 initialBalance = VBMS_TOKEN.balanceOf(address(this));

        // Step 1: Mint packs to this contract
        // This will trigger onERC721Received for each NFT minted
        drop.mint{value: msg.value}(
            quantity,
            address(this),     // recipient = this contract
            defaultReferrer,   // referrer
            ""                 // comment
        );

        // Step 2: Verify we received the expected number of tokens
        require(_receivedTokenIds.length == quantity, "Token count mismatch");

        // Step 3: Sell each pack using the ACTUAL tokenIds we received
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _receivedTokenIds[i];
            drop.sellAndClaimOffer(
                tokenId,
                address(this),   // recipient for VBMS
                defaultReferrer  // referrer
            );
        }

        // Step 4: Transfer all received VBMS to the buyer
        uint256 finalBalance = VBMS_TOKEN.balanceOf(address(this));
        uint256 vbmsReceived = finalBalance - initialBalance;

        require(vbmsReceived > 0, "No VBMS received");
        require(VBMS_TOKEN.transfer(msg.sender, vbmsReceived), "Transfer failed");

        // Copy tokenIds for event before clearing
        uint256[] memory tokenIds = new uint256[](_receivedTokenIds.length);
        for (uint256 i = 0; i < _receivedTokenIds.length; i++) {
            tokenIds[i] = _receivedTokenIds[i];
        }

        // Clear state
        delete _receivedTokenIds;
        _inBuyOperation = false;

        emit VBMSPurchased(msg.sender, boosterDrop, quantity, msg.value, vbmsReceived, tokenIds);
    }

    /**
     * Simplified buy function - uses hardcoded VBMS BoosterDrop
     *
     * @param quantity - Number of packs to buy
     */
    function buyVBMS(uint256 quantity) external payable {
        require(quantity > 0, "Must buy at least 1");
        require(msg.value > 0, "Must send ETH");
        require(!_inBuyOperation, "Reentrant call");

        // Set flag and clear previous tokenIds
        _inBuyOperation = true;
        delete _receivedTokenIds;

        IBoosterDrop drop = IBoosterDrop(VBMS_BOOSTER_DROP);

        // Get initial VBMS balance
        uint256 initialBalance = VBMS_TOKEN.balanceOf(address(this));

        // Step 1: Mint packs - onERC721Received will capture tokenIds
        drop.mint{value: msg.value}(
            quantity,
            address(this),
            defaultReferrer,
            ""
        );

        // Step 2: Verify token count
        require(_receivedTokenIds.length == quantity, "Token count mismatch");

        // Step 3: Sell using ACTUAL tokenIds
        for (uint256 i = 0; i < quantity; i++) {
            drop.sellAndClaimOffer(_receivedTokenIds[i], address(this), defaultReferrer);
        }

        // Step 4: Transfer VBMS to buyer
        uint256 finalBalance = VBMS_TOKEN.balanceOf(address(this));
        uint256 vbmsReceived = finalBalance - initialBalance;

        require(vbmsReceived > 0, "No VBMS received");
        require(VBMS_TOKEN.transfer(msg.sender, vbmsReceived), "Transfer failed");

        // Copy for event
        uint256[] memory tokenIds = new uint256[](_receivedTokenIds.length);
        for (uint256 i = 0; i < _receivedTokenIds.length; i++) {
            tokenIds[i] = _receivedTokenIds[i];
        }

        // Clear state
        delete _receivedTokenIds;
        _inBuyOperation = false;

        emit VBMSPurchased(msg.sender, VBMS_BOOSTER_DROP, quantity, msg.value, vbmsReceived, tokenIds);
    }

    /**
     * ERC721 receiver callback - CAPTURES ACTUAL MINTED TOKEN IDS
     *
     * This is the key to solving the race condition!
     * When mint() transfers NFTs to us, this callback is called with the ACTUAL tokenId.
     */
    function onERC721Received(
        address,        // operator
        address,        // from
        uint256 tokenId,
        bytes calldata  // data
    ) external override returns (bytes4) {
        // Only capture tokenIds during a buy operation
        if (_inBuyOperation) {
            _receivedTokenIds.push(tokenId);
        }
        return IERC721Receiver.onERC721Received.selector;
    }

    /**
     * Get mint price for X packs
     */
    function getMintPrice(address boosterDrop, uint256 quantity) external view returns (uint256) {
        return IBoosterDrop(boosterDrop).getMintPrice(quantity);
    }

    /**
     * Get VBMS mint price
     */
    function getVBMSMintPrice(uint256 quantity) external view returns (uint256) {
        return IBoosterDrop(VBMS_BOOSTER_DROP).getMintPrice(quantity);
    }

    /**
     * Emergency: Withdraw stuck ETH
     */
    function withdrawETH() external {
        require(msg.sender == owner, "Not owner");
        payable(owner).transfer(address(this).balance);
    }

    /**
     * Emergency: Withdraw stuck tokens
     */
    function withdrawTokens(address token) external {
        require(msg.sender == owner, "Not owner");
        IERC20(token).transfer(owner, IERC20(token).balanceOf(address(this)));
    }

    /**
     * Transfer ownership
     */
    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Not owner");
        owner = newOwner;
    }

    /**
     * Receive ETH
     */
    receive() external payable {}
}
