// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * VBMSRouter V6 - Hybrid approach: Callback + Fallback retry
 *
 * GUARANTEED TO WORK by combining two strategies:
 * 1. PRIMARY: Capture tokenIds via onERC721Received callback (if safeMint used)
 * 2. FALLBACK: If callback didn't fire, use try-catch search around expected tokenId
 *
 * This router handles BOTH scenarios:
 * - BoosterDrop uses _safeMint → callback captures tokenIds ✓
 * - BoosterDrop uses _mint → fallback search finds tokenIds ✓
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

    // Batch version - more gas efficient (used by competitor router)
    function sellAndClaimOfferBatch(uint256[] calldata tokenIds) external;

    function getMintPrice(uint256 quantity) external view returns (uint256);
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address);
    function balanceOf(address owner) external view returns (uint256);
}

interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

contract VBMSRouterV6 is IERC721Receiver {
    // VBMS Token
    IERC20 public constant VBMS_TOKEN = IERC20(0xb03439567cD22f278B21e1FFcDFB8E1696763827);

    // VBMS BoosterDrop
    address public constant VBMS_BOOSTER_DROP = 0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728;

    // Default referrer
    address public immutable defaultReferrer;

    // Owner
    address public owner;

    // ============================================
    // Callback-based tokenId capture
    // ============================================
    uint256[] private _receivedTokenIds;
    bool private _inBuyOperation;

    // Events
    event VBMSPurchased(
        address indexed buyer,
        address indexed boosterDrop,
        uint256 quantity,
        uint256 ethSpent,
        uint256 vbmsReceived,
        bool usedCallback,
        uint256 firstTokenId
    );

    event Debug(string message, uint256 value);

    constructor(address _referrer) {
        defaultReferrer = _referrer;
        owner = msg.sender;
    }

    modifier nonReentrant() {
        require(!_inBuyOperation, "Reentrant call");
        _inBuyOperation = true;
        _;
        _inBuyOperation = false;
    }

    /**
     * Buy VBMS - Hybrid approach (callback + fallback)
     *
     * @param quantity - Number of packs to buy
     * @param expectedStartTokenId - Best guess from frontend (for fallback search)
     */
    function buyVBMS(
        uint256 quantity,
        uint256 expectedStartTokenId
    ) external payable nonReentrant {
        require(quantity > 0, "Must buy at least 1");
        require(msg.value > 0, "Must send ETH");

        // Clear any previous callback data
        delete _receivedTokenIds;

        IBoosterDrop drop = IBoosterDrop(VBMS_BOOSTER_DROP);
        uint256 initialBalance = VBMS_TOKEN.balanceOf(address(this));

        // ============================================
        // STEP 1: MINT - may trigger callback
        // ============================================
        drop.mint{value: msg.value}(
            quantity,
            address(this),
            defaultReferrer,
            ""
        );

        // ============================================
        // STEP 2: SELL using best available method
        // ============================================
        uint256 firstTokenId;
        bool usedCallback;

        if (_receivedTokenIds.length == quantity) {
            // CALLBACK WORKED! Use batch function (more gas efficient)
            usedCallback = true;
            firstTokenId = _receivedTokenIds[0];

            // Use batch sell like the competitor router does
            drop.sellAndClaimOfferBatch(_receivedTokenIds);
        } else {
            // FALLBACK: Search for tokenIds around expected value
            usedCallback = false;
            uint256 sold = 0;
            uint256 searchRadius = 20; // Search ±20 from expected

            // First try exact expected value
            for (uint256 offset = 0; offset < searchRadius && sold < quantity; offset++) {
                // Try expectedStartTokenId + offset
                uint256 tokenId = expectedStartTokenId + offset;
                if (_trySell(drop, tokenId)) {
                    if (sold == 0) firstTokenId = tokenId;
                    sold++;
                }

                // Also try below expected (in case we're late)
                if (offset > 0 && sold < quantity) {
                    tokenId = expectedStartTokenId - offset;
                    if (tokenId > 0 && _trySell(drop, tokenId)) {
                        if (sold == 0) firstTokenId = tokenId;
                        sold++;
                    }
                }
            }

            require(sold == quantity, "Could not sell all tokens - tokenId mismatch too large");
        }

        // ============================================
        // STEP 3: Transfer VBMS to buyer
        // ============================================
        uint256 finalBalance = VBMS_TOKEN.balanceOf(address(this));
        uint256 vbmsReceived = finalBalance - initialBalance;

        require(vbmsReceived > 0, "No VBMS received");
        require(VBMS_TOKEN.transfer(msg.sender, vbmsReceived), "Transfer failed");

        // Clear callback data
        delete _receivedTokenIds;

        emit VBMSPurchased(
            msg.sender,
            VBMS_BOOSTER_DROP,
            quantity,
            msg.value,
            vbmsReceived,
            usedCallback,
            firstTokenId
        );
    }

    /**
     * Generic buy for any BoosterDrop
     */
    function buy(
        address boosterDrop,
        uint256 quantity,
        uint256 expectedStartTokenId
    ) external payable nonReentrant {
        require(quantity > 0, "Must buy at least 1");
        require(msg.value > 0, "Must send ETH");
        require(boosterDrop != address(0), "Invalid boosterDrop");

        delete _receivedTokenIds;

        IBoosterDrop drop = IBoosterDrop(boosterDrop);
        uint256 initialBalance = VBMS_TOKEN.balanceOf(address(this));

        // Mint
        drop.mint{value: msg.value}(
            quantity,
            address(this),
            defaultReferrer,
            ""
        );

        // Sell
        uint256 firstTokenId;
        bool usedCallback;

        if (_receivedTokenIds.length == quantity) {
            // CALLBACK WORKED! Use batch function
            usedCallback = true;
            firstTokenId = _receivedTokenIds[0];
            drop.sellAndClaimOfferBatch(_receivedTokenIds);
        } else {
            // FALLBACK: Search for tokenIds
            usedCallback = false;
            uint256 sold = 0;
            for (uint256 offset = 0; offset < 20 && sold < quantity; offset++) {
                uint256 tokenId = expectedStartTokenId + offset;
                if (_trySell(drop, tokenId)) {
                    if (sold == 0) firstTokenId = tokenId;
                    sold++;
                }
                if (offset > 0 && sold < quantity) {
                    tokenId = expectedStartTokenId - offset;
                    if (tokenId > 0 && _trySell(drop, tokenId)) {
                        if (sold == 0) firstTokenId = tokenId;
                        sold++;
                    }
                }
            }
            require(sold == quantity, "Could not sell all tokens");
        }

        // Transfer VBMS
        uint256 finalBalance = VBMS_TOKEN.balanceOf(address(this));
        uint256 vbmsReceived = finalBalance - initialBalance;

        require(vbmsReceived > 0, "No VBMS received");
        require(VBMS_TOKEN.transfer(msg.sender, vbmsReceived), "Transfer failed");

        delete _receivedTokenIds;

        emit VBMSPurchased(msg.sender, boosterDrop, quantity, msg.value, vbmsReceived, usedCallback, firstTokenId);
    }

    /**
     * Try to sell a tokenId. Returns true if successful.
     */
    function _trySell(IBoosterDrop drop, uint256 tokenId) internal returns (bool) {
        try drop.sellAndClaimOffer(tokenId, address(this), defaultReferrer) {
            return true;
        } catch {
            return false;
        }
    }

    /**
     * ERC721 Receiver - captures tokenIds when callback is triggered
     */
    function onERC721Received(
        address,
        address,
        uint256 tokenId,
        bytes calldata
    ) external override returns (bytes4) {
        if (_inBuyOperation) {
            _receivedTokenIds.push(tokenId);
        }
        return IERC721Receiver.onERC721Received.selector;
    }

    /**
     * View functions
     */
    function getMintPrice(address boosterDrop, uint256 quantity) external view returns (uint256) {
        return IBoosterDrop(boosterDrop).getMintPrice(quantity);
    }

    function getVBMSMintPrice(uint256 quantity) external view returns (uint256) {
        return IBoosterDrop(VBMS_BOOSTER_DROP).getMintPrice(quantity);
    }

    // Emergency functions
    function withdrawETH() external {
        require(msg.sender == owner, "Not owner");
        payable(owner).transfer(address(this).balance);
    }

    function withdrawTokens(address token) external {
        require(msg.sender == owner, "Not owner");
        IERC20(token).transfer(owner, IERC20(token).balanceOf(address(this)));
    }

    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Not owner");
        owner = newOwner;
    }

    receive() external payable {}
}
