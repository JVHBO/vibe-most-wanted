// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {ERC721} from "solady/tokens/ERC721.sol";
import {EIP712} from "solady/utils/EIP712.sol";
import {ECDSA} from "solady/utils/ECDSA.sol";
import {Ownable} from "solady/auth/Ownable.sol";

/// @title FarcasterCards
/// @notice Minimal ERC-721 contract for Farcaster playing cards with presigned minting
/// @dev Uses Solady for gas-efficient ERC721 implementation with EIP-712 signature verification
contract FarcasterCards is ERC721, EIP712, Ownable {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         CONSTANTS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Mint price in wei (0.0005 ETH)
    uint256 public constant MINT_PRICE = 0.0005 ether;

    /// @dev Maximum number of tokens that can be minted
    uint256 public constant MAX_SUPPLY = 10_000;

    /// @dev EIP-712 typehash for MintPermit struct
    bytes32 public constant MINT_PERMIT_TYPEHASH =
        keccak256("MintPermit(address to,uint256 fid,string ipfsURI)");

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       CUSTOM ERRORS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Signature verification failed
    error InvalidSignature();

    /// @dev Signer address cannot be zero
    error InvalidSigner();

    /// @dev Maximum supply has been reached
    error MaxSupplyReached();

    /// @dev FID has already been minted
    error FIDAlreadyMinted();

    /// @dev Insufficient payment sent
    error InsufficientPayment();

    /// @dev Minting has been permanently closed
    error MintingClosed();

    /// @dev Metadata URI cannot be empty
    error EmptyURI();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STORAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Backend signer address that authorizes mints
    address public signer;

    /// @notice Total number of tokens minted
    uint256 public totalMinted;

    /// @notice Whether minting has been permanently closed
    bool public mintingClosed;

    /// @notice Mapping from FID to whether it has been minted
    mapping(uint256 => bool) public fidMinted;

    /// @notice Mapping from token ID to IPFS metadata URI
    mapping(uint256 => string) private _tokenURIs;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Emitted when the signer address is updated
    event SignerUpdated(address indexed previousSigner, address indexed newSigner);

    /// @dev Emitted when minting is permanently closed
    event MintingClosedPermanently();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        CONSTRUCTOR                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Initialize the contract with required parameters
    /// @param _signer Address of the backend that will sign mint permissions
    constructor(address _signer) {
        if (_signer == address(0)) revert InvalidSigner();

        signer = _signer;
        _initializeOwner(msg.sender);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      ERC721 METADATA                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Returns the token collection name
    function name() public pure override returns (string memory) {
        return "Vibe Most Wanted - FID Edition";
    }

    /// @notice Returns the token collection symbol
    function symbol() public pure override returns (string memory) {
        return "VMWFID";
    }

    /// @notice Returns the metadata URI for a given token
    /// @param id Token ID to query
    /// @return The IPFS URI for the token's metadata
    function tokenURI(uint256 id) public view override returns (string memory) {
        if (!_exists(id)) revert TokenDoesNotExist();
        return _tokenURIs[id];
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       EIP712 DOMAIN                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Returns the EIP-712 domain name and version
    function _domainNameAndVersion()
        internal
        pure
        override
        returns (string memory name_, string memory version_)
    {
        name_ = "Vibe Most Wanted - FID Edition";
        version_ = "1";
    }

    /// @notice Returns the EIP-712 domain separator for signature verification
    /// @return The domain separator hash
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparator();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      MINTING LOGIC                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Mint a token with a presigned permit from the backend
    /// @dev Verifies EIP-712 signature and mints NFT
    /// @param fid The Farcaster ID to mint
    /// @param ipfsURI The IPFS metadata URI for this token
    /// @param signature EIP-712 signature from the backend signer
    function presignedMint(uint256 fid, string calldata ipfsURI, bytes calldata signature)
        external
        payable
    {
        // Check minting is not closed
        if (mintingClosed) revert MintingClosed();

        // Check max supply has not been reached
        if (totalMinted >= MAX_SUPPLY) revert MaxSupplyReached();

        // Check FID has not already been minted
        if (fidMinted[fid]) revert FIDAlreadyMinted();

        // Check payment
        if (msg.value < MINT_PRICE) revert InsufficientPayment();

        // Check URI is not empty
        if (bytes(ipfsURI).length == 0) revert EmptyURI();

        // Construct the EIP-712 struct hash
        bytes32 structHash = keccak256(
            abi.encode(MINT_PERMIT_TYPEHASH, msg.sender, fid, keccak256(bytes(ipfsURI)))
        );

        // Get the EIP-712 digest
        bytes32 digest = _hashTypedData(structHash);

        // Recover the signer from the signature
        address recoveredSigner = ECDSA.recover(digest, signature);

        // Verify the signature is from the authorized backend signer
        if (recoveredSigner != signer) revert InvalidSignature();

        // Mark FID as minted
        fidMinted[fid] = true;

        // Store the IPFS URI for this token (using FID as token ID)
        _tokenURIs[fid] = ipfsURI;

        // Mint the token to msg.sender (using FID as token ID)
        _mint(msg.sender, fid);

        // Increment total minted counter
        totalMinted++;

        // Refund excess payment
        if (msg.value > MINT_PRICE) {
            _safeTransferETH(msg.sender, msg.value - MINT_PRICE);
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       ADMIN FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Update the backend signer address
    /// @dev Only callable by contract owner
    /// @param newSigner New backend signer address
    function setSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert InvalidSigner();
        address previousSigner = signer;
        signer = newSigner;
        emit SignerUpdated(previousSigner, newSigner);
    }

    /// @notice Permanently close minting
    /// @dev Only callable by contract owner. This action is irreversible.
    function closeMinting() external onlyOwner {
        mintingClosed = true;
        emit MintingClosedPermanently();
    }

    /// @notice Withdraw contract balance to owner
    /// @dev Only callable by contract owner
    function withdraw() external onlyOwner {
        _safeTransferETH(owner(), address(this).balance);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      INTERNAL HELPERS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Safe ETH transfer helper
    function _safeTransferETH(address to, uint256 amount) internal {
        /// @solidity memory-safe-assembly
        assembly {
            if iszero(call(gas(), to, amount, codesize(), 0x00, codesize(), 0x00)) {
                mstore(0x00, 0xb12d13eb) // `ETHTransferFailed()`.
                revert(0x1c, 0x04)
            }
        }
    }
}
