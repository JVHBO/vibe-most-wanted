// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title FarcasterCards
 * @dev ERC721 NFT contract for Farcaster playing cards with signature verification
 *
 * Features:
 * - Mint cards with IPFS metadata
 * - 0.0005 ETH mint price
 * - Signature verification to ensure only FID owners can mint
 * - Owner can withdraw funds
 * - Multiple mints per user allowed
 */
contract FarcasterCards is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // Mint price: 0.0005 ETH
    uint256 public mintPrice = 0.0005 ether;

    // Verifier address for signature validation
    address public verifierAddress;

    // Total mints counter
    uint256 public totalMinted;

    // Mapping to track which FIDs have been minted
    mapping(uint256 => bool) public fidMinted;

    // Events
    event CardMinted(
        address indexed minter,
        uint256 indexed tokenId,
        uint256 fid,
        string metadataURI
    );
    event Withdrawn(address indexed owner, uint256 amount);

    constructor() ERC721("Vibe Most Wanted - FID Edition", "VMWFID") Ownable(msg.sender) {
        // Start token IDs at 1
        _tokenIdCounter.increment();
    }

    /**
     * @dev Set the verifier address (backend signer)
     */
    function setVerifierAddress(address _verifierAddress) external onlyOwner {
        verifierAddress = _verifierAddress;
    }

    /**
     * @dev Set mint price
     */
    function setMintPrice(uint256 _mintPrice) external onlyOwner {
        mintPrice = _mintPrice;
    }

    /**
     * @dev Mint a new Farcaster card NFT with signature verification
     * @param metadataURI IPFS URI for the card metadata/video
     * @param fid Farcaster ID associated with this card
     * @param signature Backend signature proving FID ownership
     */
    function mintCard(string memory metadataURI, uint256 fid, bytes memory signature)
        public
        payable
        returns (uint256)
    {
        require(msg.value >= mintPrice, "Insufficient payment");
        require(bytes(metadataURI).length > 0, "Metadata URI cannot be empty");
        require(!fidMinted[fid], "FID already minted");

        // Verify signature if verifier is set
        if (verifierAddress != address(0)) {
            require(_verifySignature(msg.sender, fid, metadataURI, signature), "Invalid signature");
        }

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        totalMinted++;
        fidMinted[fid] = true;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataURI);

        emit CardMinted(msg.sender, tokenId, fid, metadataURI);

        // Refund excess payment
        if (msg.value > mintPrice) {
            payable(msg.sender).transfer(msg.value - mintPrice);
        }

        return tokenId;
    }

    /**
     * @dev Verify signature from backend
     * Message format: keccak256(minter, "VMWFID", fid, metadataURI)
     */
    function _verifySignature(
        address minter,
        uint256 fid,
        string memory metadataURI,
        bytes memory signature
    ) internal view returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked(minter, "VMWFID", fid, metadataURI));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address recoveredSigner = ECDSA.recover(ethSignedMessageHash, signature);

        return recoveredSigner == verifierAddress;
    }

    /**
     * @dev Batch mint multiple cards (gas optimization)
     * @param metadataURIs Array of IPFS URIs
     * @param fids Array of Farcaster IDs
     * @param signatures Array of signatures
     */
    function batchMintCards(
        string[] memory metadataURIs,
        uint256[] memory fids,
        bytes[] memory signatures
    )
        public
        payable
        returns (uint256[] memory)
    {
        require(metadataURIs.length == fids.length, "Arrays length mismatch");
        require(metadataURIs.length == signatures.length, "Signatures length mismatch");
        require(metadataURIs.length > 0, "Empty arrays");
        require(msg.value >= mintPrice * metadataURIs.length, "Insufficient payment");

        uint256[] memory tokenIds = new uint256[](metadataURIs.length);

        for (uint256 i = 0; i < metadataURIs.length; i++) {
            require(!fidMinted[fids[i]], "FID already minted");

            // Verify signature if verifier is set
            if (verifierAddress != address(0)) {
                require(
                    _verifySignature(msg.sender, fids[i], metadataURIs[i], signatures[i]),
                    "Invalid signature"
                );
            }

            uint256 tokenId = _tokenIdCounter.current();
            _tokenIdCounter.increment();
            totalMinted++;
            fidMinted[fids[i]] = true;

            _safeMint(msg.sender, tokenId);
            _setTokenURI(tokenId, metadataURIs[i]);

            tokenIds[i] = tokenId;

            emit CardMinted(msg.sender, tokenId, fids[i], metadataURIs[i]);
        }

        // Refund excess payment
        uint256 totalCost = mintPrice * metadataURIs.length;
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }

        return tokenIds;
    }

    /**
     * @dev Withdraw contract balance to owner
     */
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");

        emit Withdrawn(owner(), balance);
    }

    /**
     * @dev Get contract balance
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Get total number of cards minted
     */
    function getTotalMinted() public view returns (uint256) {
        return totalMinted;
    }

    /**
     * @dev Check if a FID has been minted
     */
    function isFidMinted(uint256 fid) public view returns (bool) {
        return fidMinted[fid];
    }

    /**
     * @dev Get all token IDs owned by an address
     */
    function tokensOfOwner(address owner)
        public
        view
        returns (uint256[] memory)
    {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](tokenCount);
        uint256 currentIndex = 0;

        for (uint256 i = 1; i < _tokenIdCounter.current(); i++) {
            if (_ownerOf(i) == owner) {
                tokenIds[currentIndex] = i;
                currentIndex++;
            }
        }

        return tokenIds;
    }

    // Override required functions
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
