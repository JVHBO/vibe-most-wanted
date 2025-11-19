// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title FarcasterCards
 * @dev ERC721 NFT contract for Farcaster playing cards
 *
 * Features:
 * - Mint cards with IPFS metadata
 * - 0.0005 ETH mint price
 * - Owner can withdraw funds
 * - Multiple mints per user allowed
 */
contract FarcasterCards is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // Mint price: 0.0005 ETH
    uint256 public constant MINT_PRICE = 0.0005 ether;

    // Total mints counter
    uint256 public totalMinted;

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
     * @dev Mint a new Farcaster card NFT
     * @param metadataURI IPFS URI for the card metadata/video
     * @param fid Farcaster ID associated with this card
     */
    function mintCard(string memory metadataURI, uint256 fid)
        public
        payable
        returns (uint256)
    {
        require(msg.value >= MINT_PRICE, "Insufficient payment");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        totalMinted++;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataURI);

        emit CardMinted(msg.sender, tokenId, fid, metadataURI);

        // Refund excess payment
        if (msg.value > MINT_PRICE) {
            payable(msg.sender).transfer(msg.value - MINT_PRICE);
        }

        return tokenId;
    }

    /**
     * @dev Batch mint multiple cards (gas optimization)
     * @param metadataURIs Array of IPFS URIs
     * @param fids Array of Farcaster IDs
     */
    function batchMintCards(string[] memory metadataURIs, uint256[] memory fids)
        public
        payable
        returns (uint256[] memory)
    {
        require(metadataURIs.length == fids.length, "Arrays length mismatch");
        require(metadataURIs.length > 0, "Empty arrays");
        require(msg.value >= MINT_PRICE * metadataURIs.length, "Insufficient payment");

        uint256[] memory tokenIds = new uint256[](metadataURIs.length);

        for (uint256 i = 0; i < metadataURIs.length; i++) {
            uint256 tokenId = _tokenIdCounter.current();
            _tokenIdCounter.increment();
            totalMinted++;

            _safeMint(msg.sender, tokenId);
            _setTokenURI(tokenId, metadataURIs[i]);

            tokenIds[i] = tokenId;

            emit CardMinted(msg.sender, tokenId, fids[i], metadataURIs[i]);
        }

        // Refund excess payment
        uint256 totalCost = MINT_PRICE * metadataURIs.length;
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
