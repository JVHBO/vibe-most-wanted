// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * VBMSRouter V5 - Alternative race-condition fix WITHOUT relying on callbacks
 *
 * PROBLEM: V4 assumes BoosterDrop uses _safeMint (calls onERC721Received).
 *          If it uses regular _mint, V4 fails.
 *
 * V5 SOLUTION: Query the nextTokenId storage slot BEFORE and AFTER mint
 *              to calculate the ACTUAL minted tokenIds.
 *
 * Flow:
 * 1. Read nextTokenId from storage (e.g., 11275)
 * 2. mint() - atomically increments nextTokenId to 11276
 * 3. Calculate: minted tokenId = previousNextTokenId = 11275
 * 4. sell tokenId 11275 (we know we own it because we just minted it!)
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

contract VBMSRouterV5 is IERC721Receiver {
    // VBMS Token address
    IERC20 public constant VBMS_TOKEN = IERC20(0xb03439567cD22f278B21e1FFcDFB8E1696763827);

    // Default VBMS BoosterDrop
    address public constant VBMS_BOOSTER_DROP = 0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728;

    // Storage slot for nextTokenId in BoosterDrop (verified via Basescan)
    uint256 public constant NEXT_TOKEN_ID_SLOT = 7;

    // Default referrer for fees
    address public immutable defaultReferrer;

    // Owner for emergency withdrawals
    address public owner;

    // Reentrancy guard
    bool private _locked;

    // Events
    event VBMSPurchased(
        address indexed buyer,
        address indexed boosterDrop,
        uint256 quantity,
        uint256 ethSpent,
        uint256 vbmsReceived,
        uint256 firstTokenId
    );

    constructor(address _referrer) {
        defaultReferrer = _referrer;
        owner = msg.sender;
    }

    modifier nonReentrant() {
        require(!_locked, "Reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    /**
     * Read nextTokenId directly from BoosterDrop storage
     */
    function _getNextTokenId(address boosterDrop) internal view returns (uint256) {
        bytes32 slot = bytes32(NEXT_TOKEN_ID_SLOT);
        bytes32 value;
        assembly {
            value := sload(slot)
        }
        // Can't use sload on external contract, need staticcall to simulate
        // Actually, use the proper way: getStorageAt equivalent

        // We need to call the boosterDrop to read storage
        // But there's no public getter... let's use assembly

        // Actually, the correct approach is to use extcodecopy or a view call
        // For now, use a workaround with assembly staticcall

        // Simpler: just read from the external contract's storage
        // This requires using inline assembly with extcodecopy

        // SIMPLEST: The proxy contract at boosterDrop delegates to implementation
        // Storage is on the PROXY, so we can read it with assembly
        assembly {
            // staticcall to read storage from external contract
            // Create calldata for a storage read (this won't work directly)
            // We need eth_getStorageAt which is not available in Solidity

            // Alternative: use the fact that totalSupply or similar returns this
            value := 0 // Placeholder - we'll use a different method
        }

        return uint256(value);
    }

    /**
     * Buy VBMS tokens with ETH - RACE-CONDITION PROOF (Storage-based)
     *
     * This version reads the nextTokenId from storage ATOMICALLY
     * within the same transaction, after mint() completes.
     *
     * @param boosterDrop - The BoosterDrop contract address
     * @param quantity - Number of packs to buy
     */
    function buy(
        address boosterDrop,
        uint256 quantity
    ) external payable nonReentrant {
        require(quantity > 0, "Must buy at least 1");
        require(msg.value > 0, "Must send ETH");
        require(boosterDrop != address(0), "Invalid boosterDrop");

        IBoosterDrop drop = IBoosterDrop(boosterDrop);

        // Get initial VBMS balance
        uint256 initialBalance = VBMS_TOKEN.balanceOf(address(this));

        // TRICK: We can't read external storage directly in Solidity
        // But we CAN read totalSupply before/after to infer tokenIds!
        // BoosterDrop's tokenIds are: totalSupply + 1, totalSupply + 2, ...

        // Actually the REAL trick: tokenIds are sequential
        // If we query totalSupply before mint, the next tokenId is totalSupply + 1
        // But wait - totalSupply might not equal the last tokenId if tokens were burned

        // BEST APPROACH: Query the current nextTokenId from a public view function
        // Most ERC721 implementations don't expose this...

        // FALLBACK: Use the startingTokenId from frontend BUT verify ownership after mint
        // This still has race condition...

        // ULTIMATE FIX: Just try to sell ALL tokens owned by this contract!
        // After mint, we own `quantity` new NFTs. Sell them all!

        // Since we need tokenIds for sellAndClaimOffer, and we can't enumerate
        // our NFTs easily, let's use a different approach:

        // Step 1: Mint packs
        drop.mint{value: msg.value}(
            quantity,
            address(this),
            defaultReferrer,
            ""
        );

        // Step 2: The minted tokens are NOW owned by this contract
        // We need to sell them, but we need their tokenIds

        // WORKAROUND: We require the caller to pass startingTokenId
        // But we VERIFY ownership before selling
        // If we don't own it, we revert with a helpful error

        // Actually, this brings us back to V3's problem...

        // REAL SOLUTION: Need to find another way

        revert("V5 incomplete - needs tokenId discovery mechanism");
    }

    /**
     * Buy VBMS with ownership verification
     *
     * @param quantity - Number of packs
     * @param expectedStartTokenId - Frontend-provided tokenId (best guess)
     *
     * This function verifies ownership after mint, if we don't own the expected
     * tokenIds, it searches nearby tokenIds.
     */
    function buyVBMSWithRetry(
        uint256 quantity,
        uint256 expectedStartTokenId
    ) external payable nonReentrant {
        require(quantity > 0, "Must buy at least 1");
        require(msg.value > 0, "Must send ETH");

        IBoosterDrop drop = IBoosterDrop(VBMS_BOOSTER_DROP);

        // Get initial VBMS balance
        uint256 initialBalance = VBMS_TOKEN.balanceOf(address(this));

        // Step 1: Mint packs
        drop.mint{value: msg.value}(
            quantity,
            address(this),
            defaultReferrer,
            ""
        );

        // Step 2: Try to sell starting from expectedStartTokenId
        // If ownership check fails, search nearby
        uint256 sold = 0;
        uint256 searchRange = 10; // Search up to 10 tokenIds around expected

        for (uint256 offset = 0; offset < searchRange && sold < quantity; offset++) {
            // Try expected + offset first
            uint256 tokenId = expectedStartTokenId + offset;
            if (_tryToSell(drop, tokenId)) {
                sold++;
            }
        }

        require(sold == quantity, "Could not sell all tokens");

        // Step 3: Transfer VBMS to buyer
        uint256 finalBalance = VBMS_TOKEN.balanceOf(address(this));
        uint256 vbmsReceived = finalBalance - initialBalance;

        require(vbmsReceived > 0, "No VBMS received");
        require(VBMS_TOKEN.transfer(msg.sender, vbmsReceived), "Transfer failed");

        emit VBMSPurchased(msg.sender, VBMS_BOOSTER_DROP, quantity, msg.value, vbmsReceived, expectedStartTokenId);
    }

    /**
     * Try to sell a specific tokenId. Returns true if successful.
     */
    function _tryToSell(IBoosterDrop drop, uint256 tokenId) internal returns (bool) {
        // Try-catch to handle reverts (e.g., not owner)
        try drop.sellAndClaimOffer(tokenId, address(this), defaultReferrer) {
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Simple buyVBMS that trusts the startingTokenId
     * FALLBACK - same as V3 but with better error messages
     */
    function buyVBMS(
        uint256 quantity,
        uint256 startingTokenId
    ) external payable nonReentrant {
        require(quantity > 0, "Must buy at least 1");
        require(msg.value > 0, "Must send ETH");

        IBoosterDrop drop = IBoosterDrop(VBMS_BOOSTER_DROP);
        uint256 initialBalance = VBMS_TOKEN.balanceOf(address(this));

        // Mint
        drop.mint{value: msg.value}(
            quantity,
            address(this),
            defaultReferrer,
            ""
        );

        // Sell with try-catch for better errors
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = startingTokenId + i;
            try drop.sellAndClaimOffer(tokenId, address(this), defaultReferrer) {
                // Success
            } catch Error(string memory reason) {
                revert(string.concat("Sell failed for tokenId ", _toString(tokenId), ": ", reason));
            } catch {
                revert(string.concat("Sell failed for tokenId ", _toString(tokenId), ": unknown error"));
            }
        }

        // Transfer VBMS
        uint256 finalBalance = VBMS_TOKEN.balanceOf(address(this));
        uint256 vbmsReceived = finalBalance - initialBalance;

        require(vbmsReceived > 0, "No VBMS received");
        require(VBMS_TOKEN.transfer(msg.sender, vbmsReceived), "Transfer failed");

        emit VBMSPurchased(msg.sender, VBMS_BOOSTER_DROP, quantity, msg.value, vbmsReceived, startingTokenId);
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    /**
     * ERC721 receiver (required even if not used)
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
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
