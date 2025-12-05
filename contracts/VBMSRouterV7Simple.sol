// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * VBMSRouterV7Simple - Copy of the working MintAndSellWrapper pattern
 *
 * Key insight: Calculate tokenIds BEFORE minting, assuming sequential mint
 * This works because ERC721A mints sequentially from _currentIndex
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

interface IBoosterDropV2 {
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

    function sellAndClaimOfferBatch(uint256[] calldata tokenIds) external;

    function boosterTokenAddress() external view returns (address);
    function getMintPrice(uint256 quantity) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

contract VBMSRouterV7Simple is IERC721Receiver {
    address public constant VBMS_BOOSTER_DROP = 0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728;
    address public constant VBMS_TOKEN = 0xb03439567cD22f278B21e1FFcDFB8E1696763827;

    address public owner;
    address public defaultReferrer;

    event Purchase(
        address indexed buyer,
        uint256 quantity,
        uint256 ethSpent,
        uint256 tokensReceived,
        uint256 startTokenId
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
     * Buy VBMS - requires startingTokenId from frontend
     * Frontend should read totalSupply() + 1 right before calling
     */
    function buyVBMS(uint256 quantity, uint256 startingTokenId) external payable {
        require(quantity > 0, "Must buy at least 1");
        require(msg.value > 0, "Must send ETH");
        require(startingTokenId > 0, "Invalid startingTokenId");

        IBoosterDropV2 drop = IBoosterDropV2(VBMS_BOOSTER_DROP);
        IERC20 token = IERC20(VBMS_TOKEN);

        uint256 initialBalance = token.balanceOf(address(this));

        // Pre-calculate tokenIds (sequential from startingTokenId)
        uint256[] memory tokenIds = new uint256[](quantity);
        for (uint256 i = 0; i < quantity; i++) {
            tokenIds[i] = startingTokenId + i;
        }

        // Mint to this contract
        drop.mint{value: msg.value}(
            quantity,
            address(this),
            defaultReferrer,
            ""
        );

        // Sell batch
        _sellBatch(drop, tokenIds);

        // Transfer tokens to buyer
        uint256 finalBalance = token.balanceOf(address(this));
        uint256 tokensReceived = finalBalance - initialBalance;

        require(tokensReceived > 0, "No tokens received");
        require(token.transfer(msg.sender, tokensReceived), "Transfer failed");

        // Refund excess ETH
        if (address(this).balance > 0) {
            payable(msg.sender).transfer(address(this).balance);
        }

        emit Purchase(msg.sender, quantity, msg.value, tokensReceived, startingTokenId);
    }

    /**
     * Buy with auto-detected startingTokenId
     * Reads totalSupply on-chain (slightly more gas, but no race condition risk)
     */
    function buyVBMSAuto(uint256 quantity) external payable {
        require(quantity > 0, "Must buy at least 1");
        require(msg.value > 0, "Must send ETH");

        IBoosterDropV2 drop = IBoosterDropV2(VBMS_BOOSTER_DROP);
        IERC20 token = IERC20(VBMS_TOKEN);

        uint256 initialBalance = token.balanceOf(address(this));

        // Get current supply - next minted will be supply + 1
        // (ERC721A starts at index 1 typically)
        uint256 currentSupply = drop.totalSupply();
        uint256 startingTokenId = currentSupply + 1;

        // Pre-calculate tokenIds
        uint256[] memory tokenIds = new uint256[](quantity);
        for (uint256 i = 0; i < quantity; i++) {
            tokenIds[i] = startingTokenId + i;
        }

        // Mint to this contract
        drop.mint{value: msg.value}(
            quantity,
            address(this),
            defaultReferrer,
            ""
        );

        // Sell batch
        _sellBatch(drop, tokenIds);

        // Transfer tokens to buyer
        uint256 finalBalance = token.balanceOf(address(this));
        uint256 tokensReceived = finalBalance - initialBalance;

        require(tokensReceived > 0, "No tokens received");
        require(token.transfer(msg.sender, tokensReceived), "Transfer failed");

        // Refund excess ETH
        if (address(this).balance > 0) {
            payable(msg.sender).transfer(address(this).balance);
        }

        emit Purchase(msg.sender, quantity, msg.value, tokensReceived, startingTokenId);
    }

    /**
     * Try batch sell, fallback to individual
     */
    function _sellBatch(IBoosterDropV2 drop, uint256[] memory tokenIds) internal {
        // Try batch first (gas efficient)
        try drop.sellAndClaimOfferBatch(tokenIds) {
            // Success
        } catch {
            // Fallback: sell individually
            for (uint256 i = 0; i < tokenIds.length; i++) {
                drop.sellAndClaimOffer(
                    tokenIds[i],
                    address(this),
                    defaultReferrer
                );
            }
        }
    }

    /**
     * ERC721 receiver (needed to receive NFTs)
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
     * View functions
     */
    function getVBMSMintPrice(uint256 quantity) external view returns (uint256) {
        return IBoosterDropV2(VBMS_BOOSTER_DROP).getMintPrice(quantity);
    }

    function getNextTokenId() external view returns (uint256) {
        return IBoosterDropV2(VBMS_BOOSTER_DROP).totalSupply() + 1;
    }

    /**
     * Admin
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
        owner = newOwner;
    }

    receive() external payable {}
}
