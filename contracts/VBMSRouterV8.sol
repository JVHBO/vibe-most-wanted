// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * VBMSRouterV8 - Fixed mint interface
 * Based on working MintAndSellWrapper from @zazza
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

interface IBoosterDropV2 {
    function mint(
        uint256 quantity,
        address recipient,
        address referrer,
        address originReferrer  // FIXED: address, not string
    ) external payable;

    function sellAndClaimOfferBatch(uint256[] calldata tokenIds) external;
    function sellAndClaimOffer(uint256 tokenId, address recipient, address referrer) external;
    function boosterTokenAddress() external view returns (address);
    function getMintPrice(uint256 quantity) external view returns (uint256);
}

contract VBMSRouterV8 is IERC721Receiver {
    address public constant VBMS_BOOSTER_DROP = 0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728;
    address public constant VBMS_TOKEN = 0xb03439567cD22f278B21e1FFcDFB8E1696763827;

    address public owner;
    address public defaultReferrer;

    event VBMSPurchased(
        address indexed buyer,
        uint256 quantity,
        uint256 ethSpent,
        uint256 vbmsReceived
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
     * Buy VBMS with startingTokenId from frontend
     */
    function buyVBMS(uint256 quantity, uint256 startingTokenId) external payable {
        require(quantity > 0, "Quantity must be > 0");
        require(msg.value > 0, "Must send ETH");
        require(startingTokenId > 0, "Invalid tokenId");

        IBoosterDropV2 drop = IBoosterDropV2(VBMS_BOOSTER_DROP);
        IERC20 token = IERC20(VBMS_TOKEN);

        uint256 initialBalance = token.balanceOf(address(this));

        // Build tokenIds array
        uint256[] memory tokenIds = new uint256[](quantity);
        for (uint256 i = 0; i < quantity; i++) {
            tokenIds[i] = startingTokenId + i;
        }

        // Mint - FIXED: 4th param is address, not string
        drop.mint{value: msg.value}(
            quantity,
            address(this),
            defaultReferrer,
            defaultReferrer  // originReferrer
        );

        // Sell batch
        drop.sellAndClaimOfferBatch(tokenIds);

        // Transfer VBMS to buyer
        uint256 finalBalance = token.balanceOf(address(this));
        uint256 received = finalBalance - initialBalance;
        require(received > 0, "No tokens received");
        require(token.transfer(msg.sender, received), "Transfer failed");

        // Refund excess ETH
        if (address(this).balance > 0) {
            payable(msg.sender).transfer(address(this).balance);
        }

        emit VBMSPurchased(msg.sender, quantity, msg.value, received);
    }

    function getVBMSMintPrice(uint256 quantity) external view returns (uint256) {
        return IBoosterDropV2(VBMS_BOOSTER_DROP).getMintPrice(quantity);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function setReferrer(address _referrer) external onlyOwner {
        defaultReferrer = _referrer;
    }

    function withdrawETH() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    function withdrawTokens(address _token) external onlyOwner {
        IERC20(_token).transfer(owner, IERC20(_token).balanceOf(address(this)));
    }

    receive() external payable {}
}
