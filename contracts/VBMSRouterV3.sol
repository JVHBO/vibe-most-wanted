// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * VBMSRouter V3 - Buy VBMS tokens in a single transaction
 *
 * Based on the working router at 0xe08287f93ffc3d1d36334b12485467e2618eaf39
 *
 * Flow: ETH → mint Pack → sell Pack → VBMS tokens to user
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

interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address);
    function transferFrom(address from, address to, uint256 tokenId) external;
}

interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

contract VBMSRouterV3 is IERC721Receiver {
    // VBMS Token address (same for all BoosterDrop collections)
    IERC20 public constant VBMS_TOKEN = IERC20(0xb03439567cD22f278B21e1FFcDFB8E1696763827);

    // Default referrer for fees
    address public immutable defaultReferrer;

    // Owner for emergency withdrawals
    address public owner;

    // Events
    event VBMSPurchased(
        address indexed buyer,
        address indexed boosterDrop,
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
     *
     * @param boosterDrop - The BoosterDrop contract address (e.g., VBMS collection)
     * @param quantity - Number of packs to buy (1 pack = ~100k VBMS)
     * @param startingTokenId - The next token ID (read from BoosterDrop storage slot 7)
     *
     * Function selector: This matches the working router's interface
     */
    function buy(
        address boosterDrop,
        uint256 quantity,
        uint256 startingTokenId
    ) external payable {
        require(quantity > 0, "Must buy at least 1");
        require(msg.value > 0, "Must send ETH");
        require(boosterDrop != address(0), "Invalid boosterDrop");

        IBoosterDrop drop = IBoosterDrop(boosterDrop);

        // Get initial VBMS balance
        uint256 initialBalance = VBMS_TOKEN.balanceOf(address(this));

        // Step 1: Mint packs to this contract
        drop.mint{value: msg.value}(
            quantity,
            address(this),     // recipient = this contract
            defaultReferrer,   // referrer
            ""                 // comment (empty string)
        );

        // Step 2: Sell each pack for VBMS
        // Token IDs are sequential starting from startingTokenId
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = startingTokenId + i;

            // Sell the pack - VBMS goes to this contract
            drop.sellAndClaimOffer(
                tokenId,
                address(this),   // recipient for VBMS
                defaultReferrer  // referrer
            );
        }

        // Step 3: Transfer all received VBMS to the buyer
        uint256 finalBalance = VBMS_TOKEN.balanceOf(address(this));
        uint256 vbmsReceived = finalBalance - initialBalance;

        require(vbmsReceived > 0, "No VBMS received");
        require(VBMS_TOKEN.transfer(msg.sender, vbmsReceived), "Transfer failed");

        emit VBMSPurchased(msg.sender, boosterDrop, quantity, msg.value, vbmsReceived);
    }

    /**
     * Simplified buy function - uses hardcoded VBMS BoosterDrop
     *
     * @param quantity - Number of packs to buy
     * @param startingTokenId - The next token ID
     * @param referrer - Optional referrer (use address(0) for default)
     */
    function buyVBMS(
        uint256 quantity,
        uint256 startingTokenId,
        address referrer
    ) external payable {
        require(quantity > 0, "Must buy at least 1");
        require(msg.value > 0, "Must send ETH");

        // Hardcoded VBMS BoosterDrop address
        address boosterDrop = 0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728;
        IBoosterDrop drop = IBoosterDrop(boosterDrop);

        address ref = referrer != address(0) ? referrer : defaultReferrer;

        // Get initial VBMS balance
        uint256 initialBalance = VBMS_TOKEN.balanceOf(address(this));

        // Step 1: Mint packs to this contract
        drop.mint{value: msg.value}(
            quantity,
            address(this),
            ref,
            ""  // comment (empty string)
        );

        // Step 2: Sell each pack for VBMS
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = startingTokenId + i;
            drop.sellAndClaimOffer(tokenId, address(this), ref);
        }

        // Step 3: Transfer all received VBMS to the buyer
        uint256 finalBalance = VBMS_TOKEN.balanceOf(address(this));
        uint256 vbmsReceived = finalBalance - initialBalance;

        require(vbmsReceived > 0, "No VBMS received");
        require(VBMS_TOKEN.transfer(msg.sender, vbmsReceived), "Transfer failed");

        emit VBMSPurchased(msg.sender, boosterDrop, quantity, msg.value, vbmsReceived);
    }

    /**
     * Get mint price for X packs
     */
    function getMintPrice(address boosterDrop, uint256 quantity) external view returns (uint256) {
        return IBoosterDrop(boosterDrop).getMintPrice(quantity);
    }

    /**
     * Required to receive NFTs during mint
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
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
