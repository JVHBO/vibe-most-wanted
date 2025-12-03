// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * VBMSRouter V7 - Ownership-based token discovery
 *
 * THE FIX: Instead of blindly trying to sell tokenIds, we VERIFY OWNERSHIP first.
 *
 * Flow:
 * 1. Read totalSupply before mint
 * 2. Mint packs to this contract
 * 3. Read totalSupply after mint
 * 4. Check ownerOf for each tokenId in range to find OUR tokens
 * 5. Sell only the tokens we verified we own
 *
 * This is race-condition proof because:
 * - We check ownership AFTER mint completes (same tx)
 * - Other mints in same block don't affect us - we find OUR tokens by ownership
 * - ownerOf is a view call (cheap)
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
    function totalSupply() external view returns (uint256);
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

contract VBMSRouterV7 is IERC721Receiver {
    // VBMS Token
    IERC20 public constant VBMS_TOKEN = IERC20(0xb03439567cD22f278B21e1FFcDFB8E1696763827);

    // VBMS BoosterDrop
    address public constant VBMS_BOOSTER_DROP = 0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728;

    // Default referrer (hardcoded - saves gas, can't be changed)
    address public constant DEFAULT_REFERRER = 0x2a9585Da40de004d6FF0F5f12CFe726bD2F98b52;

    // Owner for emergencies
    address public owner;

    // Reentrancy guard
    bool private _locked;

    // Events
    event VBMSPurchased(
        address indexed buyer,
        uint256 quantity,
        uint256 ethSpent,
        uint256 vbmsReceived,
        uint256 firstTokenId
    );

    constructor() {
        owner = msg.sender;
    }

    modifier nonReentrant() {
        require(!_locked, "Reentrant");
        _locked = true;
        _;
        _locked = false;
    }

    /**
     * Buy VBMS tokens with ETH
     *
     * @param quantity - Number of packs to buy (1 pack ≈ 100k VBMS)
     *
     * No tokenId parameter needed! We discover tokens by ownership.
     */
    function buyVBMS(uint256 quantity) external payable nonReentrant {
        require(quantity > 0 && quantity <= 10, "1-10 packs max");
        require(msg.value > 0, "Must send ETH");

        IBoosterDrop drop = IBoosterDrop(VBMS_BOOSTER_DROP);
        IERC721 nft = IERC721(VBMS_BOOSTER_DROP);

        // Get initial state
        uint256 initialVBMS = VBMS_TOKEN.balanceOf(address(this));
        uint256 supplyBefore = drop.totalSupply();

        // ============================================
        // STEP 1: MINT packs to this contract
        // ============================================
        drop.mint{value: msg.value}(
            quantity,
            address(this),
            DEFAULT_REFERRER,
            ""
        );

        // ============================================
        // STEP 2: DISCOVER tokens we own by checking ownership
        // ============================================
        uint256 supplyAfter = drop.totalSupply();

        // Our tokens are somewhere between supplyBefore+1 and supplyAfter
        // But due to race conditions, we need to search a wider range
        uint256 searchStart = supplyBefore > 10 ? supplyBefore - 10 : 1;
        uint256 searchEnd = supplyAfter + 10;

        uint256[] memory ownedTokenIds = new uint256[](quantity);
        uint256 found = 0;

        for (uint256 tokenId = searchStart; tokenId <= searchEnd && found < quantity; tokenId++) {
            // Check if we own this token
            try nft.ownerOf(tokenId) returns (address tokenOwner) {
                if (tokenOwner == address(this)) {
                    ownedTokenIds[found] = tokenId;
                    found++;
                }
            } catch {
                // Token doesn't exist, skip
            }
        }

        require(found == quantity, "Did not find all minted tokens");

        // ============================================
        // STEP 3: SELL all tokens for VBMS
        // ============================================
        for (uint256 i = 0; i < quantity; i++) {
            drop.sellAndClaimOffer(
                ownedTokenIds[i],
                address(this),
                DEFAULT_REFERRER
            );
        }

        // ============================================
        // STEP 4: TRANSFER VBMS to buyer
        // ============================================
        uint256 finalVBMS = VBMS_TOKEN.balanceOf(address(this));
        uint256 vbmsReceived = finalVBMS - initialVBMS;

        require(vbmsReceived > 0, "No VBMS received");
        require(VBMS_TOKEN.transfer(msg.sender, vbmsReceived), "Transfer failed");

        emit VBMSPurchased(
            msg.sender,
            quantity,
            msg.value,
            vbmsReceived,
            ownedTokenIds[0]
        );
    }

    /**
     * Get mint price for X packs
     */
    function getMintPrice(uint256 quantity) external view returns (uint256) {
        return IBoosterDrop(VBMS_BOOSTER_DROP).getMintPrice(quantity);
    }

    /**
     * Required for receiving NFTs
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    // ============================================
    // EMERGENCY FUNCTIONS
    // ============================================

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
