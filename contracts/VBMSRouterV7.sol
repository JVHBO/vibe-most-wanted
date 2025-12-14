// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * VBMSRouterV7 - Simplified mint-and-sell router
 *
 * Based on working MintAndSellWrapper pattern:
 * 1. Mint NFTs to this contract
 * 2. Immediately sell batch for tokens
 * 3. Transfer tokens to buyer
 *
 * Key difference: Uses callback to capture tokenIds (guaranteed accurate)
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

interface IBoosterDropV2 {
    // Mint with comment (VBMS style)
    function mint(
        uint256 quantity,
        address recipient,
        address referrer,
        string calldata comment
    ) external payable;

    // Alternative mint with originReferrer (other booster drops)
    function mint(
        uint256 amount,
        address recipient,
        address referrer,
        address originReferrer
    ) external payable;

    function sellAndClaimOffer(
        uint256 tokenId,
        address recipient,
        address referrer
    ) external;

    // Batch version (if available - simpler signature)
    function sellAndClaimOfferBatch(uint256[] calldata tokenIds) external;

    function boosterTokenAddress() external view returns (address);
    function getMintPrice(uint256 amount) external view returns (uint256);
}

contract VBMSRouterV7 is IERC721Receiver {
    // Default VBMS contracts
    address public constant VBMS_BOOSTER_DROP = 0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728;
    address public constant VBMS_TOKEN = 0xb03439567cD22f278B21e1FFcDFB8E1696763827;

    address public owner;
    address public defaultReferrer;

    // Callback storage for captured tokenIds
    uint256[] private _receivedTokenIds;
    bool private _inMintOperation;

    event Purchase(
        address indexed buyer,
        address indexed boosterDrop,
        uint256 quantity,
        uint256 ethSpent,
        uint256 tokensReceived
    );

    constructor(address _referrer) {
        owner = msg.sender;
        defaultReferrer = _referrer;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /**
     * Buy VBMS tokens - Simple and reliable
     * @param quantity Number of packs to buy
     */
    function buyVBMS(uint256 quantity) external payable {
        _buyFromBooster(VBMS_BOOSTER_DROP, VBMS_TOKEN, quantity, true);
    }

    /**
     * Buy VBMS with expectedStartTokenId (backwards compatible with V6)
     */
    function buyVBMS(uint256 quantity, uint256 /* expectedStartTokenId */) external payable {
        _buyFromBooster(VBMS_BOOSTER_DROP, VBMS_TOKEN, quantity, true);
    }

    /**
     * Generic buy for any BoosterDrop
     */
    function buy(address boosterDrop, uint256 quantity) external payable {
        address tokenAddress = IBoosterDropV2(boosterDrop).boosterTokenAddress();
        _buyFromBooster(boosterDrop, tokenAddress, quantity, false);
    }

    /**
     * Internal buy logic
     */
    function _buyFromBooster(
        address boosterDrop,
        address tokenAddress,
        uint256 quantity,
        bool useCommentMint
    ) internal {
        require(quantity > 0, "Must buy at least 1");
        require(msg.value > 0, "Must send ETH");

        // Clear previous tokenIds
        delete _receivedTokenIds;
        _inMintOperation = true;

        IBoosterDropV2 drop = IBoosterDropV2(boosterDrop);
        IERC20 token = IERC20(tokenAddress);

        uint256 initialBalance = token.balanceOf(address(this));

        // Step 1: Mint to this contract
        // Callback will capture tokenIds automatically
        if (useCommentMint) {
            // VBMS uses comment-style mint
            drop.mint{value: msg.value}(
                quantity,
                address(this),
                defaultReferrer,
                ""
            );
        } else {
            // Other boosters may use originReferrer-style
            try drop.mint{value: msg.value}(
                quantity,
                address(this),
                defaultReferrer,
                ""
            ) {} catch {
                // Try alternative signature
                IBoosterDropV2(boosterDrop).mint{value: msg.value}(
                    quantity,
                    address(this),
                    defaultReferrer,
                    defaultReferrer
                );
            }
        }

        _inMintOperation = false;

        // Step 2: Sell - use captured tokenIds from callback
        require(_receivedTokenIds.length == quantity, "TokenId capture failed");

        // Try batch first (more gas efficient)
        bool batchWorked = false;
        try drop.sellAndClaimOfferBatch(_receivedTokenIds) {
            batchWorked = true;
        } catch {
            // Fallback: sell individually
            for (uint256 i = 0; i < _receivedTokenIds.length; i++) {
                drop.sellAndClaimOffer(
                    _receivedTokenIds[i],
                    address(this),
                    defaultReferrer
                );
            }
        }

        // Step 3: Transfer tokens to buyer
        uint256 finalBalance = token.balanceOf(address(this));
        uint256 tokensReceived = finalBalance - initialBalance;

        require(tokensReceived > 0, "No tokens received");
        require(token.transfer(msg.sender, tokensReceived), "Transfer failed");

        // Cleanup
        delete _receivedTokenIds;

        // Refund excess ETH if any
        if (address(this).balance > 0) {
            payable(msg.sender).transfer(address(this).balance);
        }

        emit Purchase(msg.sender, boosterDrop, quantity, msg.value, tokensReceived);
    }

    /**
     * ERC721 callback - captures tokenIds during mint
     */
    function onERC721Received(
        address,
        address,
        uint256 tokenId,
        bytes calldata
    ) external override returns (bytes4) {
        if (_inMintOperation) {
            _receivedTokenIds.push(tokenId);
        }
        return IERC721Receiver.onERC721Received.selector;
    }

    /**
     * View functions
     */
    function getVBMSMintPrice(uint256 quantity) external view returns (uint256) {
        return IBoosterDropV2(VBMS_BOOSTER_DROP).getMintPrice(quantity);
    }

    function getMintPrice(address boosterDrop, uint256 quantity) external view returns (uint256) {
        return IBoosterDropV2(boosterDrop).getMintPrice(quantity);
    }

    /**
     * Admin functions
     */
    function setReferrer(address _referrer) external onlyOwner {
        defaultReferrer = _referrer;
    }

    function withdrawETH() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    function withdrawTokens(address token) external onlyOwner {
        IERC20(token).transfer(owner, IERC20(token).balanceOf(address(this)));
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    receive() external payable {}
}
