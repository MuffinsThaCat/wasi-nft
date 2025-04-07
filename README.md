# WASI-NFT: Filesystem Digital Assets

A browser-based application for creating, managing, and verifying unique digital assets stored directly in your filesystem. Built with the [WASI-fs-access](https://github.com/GoogleChromeLabs/wasi-fs-access) technology for secure filesystem access from the browser and [Lit Protocol](https://litprotocol.com/) for decentralized access control and key management.

## Features

- **Create Digital Assets**: Import images, videos, audio, or other files as unique digital assets
- **Cryptographic Verification**: Each asset is cryptographically signed and can be verified for authenticity
- **Local Storage**: All assets and metadata are stored in your own filesystem
- **Export & Share**: Export assets for sharing with others
- **Import Verification**: Verify and import assets shared by others
- **Blockchain Ready**: Optional bridge to register assets on blockchain networks

## How It Works

This application leverages modern web technologies to create a hybrid approach to digital assets:

1. **File System Access API**: Allows direct access to your filesystem from the browser
2. **WebAssembly (WASI)**: Provides near-native performance for cryptographic operations
3. **Ed25519 Signatures**: Cryptographically signs each asset to ensure authenticity
4. **Local-First Architecture**: Everything works offline with assets under your control
5. **Optional Blockchain Bridge**: Register selected assets on blockchains when desired

## Setup Instructions

### Prerequisites

- A modern browser supporting File System Access API (Chrome, Edge, or other Chromium-based browsers)
- Node.js and npm installed

### Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/filesystem-digital-assets.git
   cd filesystem-digital-assets
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Open your browser to `http://localhost:3000`

## Usage Guide

1. **Select Directory**: Choose a directory where your digital assets will be stored
2. **Create Asset**: Fill in the details and select a file to create your first digital asset
3. **View Gallery**: Browse through your collection of digital assets
4. **Verify Assets**: Check the authenticity of any asset in your collection
5. **Export/Share**: Export assets to share with others
6. **Import Assets**: Import assets that others have shared with you
7. **Blockchain Registration**: Optionally register selected assets on blockchain networks

## Technical Architecture

The application is built on a modular architecture:

- **Core**: Asset management, filesystem operations, and data handling
- **Crypto**: Cryptographic utilities for signing and verification
- **UI**: User interface components and interactions
- **Blockchain**: Optional bridge to blockchain networks (placeholder for future integration)

## Security Considerations

- All cryptographic operations use modern, secure algorithms (Ed25519, SHA-256)
- Private keys never leave your device
- Assets are verified using cryptographic signatures
- File content hashes ensure integrity

## Future Enhancements

- Full blockchain integration for Ethereum, Solana, and other networks
- IPFS/Arweave integration for decentralized storage
- Marketplace connector for listing assets on popular NFT marketplaces
- Enhanced metadata standards compatibility
- Multi-user features and collaboration tools

## Purpose and Advantages Over Traditional NFT Marketplaces

### Core Purpose

WASI-NFT is designed to bridge the gap between traditional files and blockchain NFTs by providing a user-controlled system for digital asset ownership and verification without requiring immediate blockchain integration.

### Key Advantages:

1. **User Sovereignty and Control**
   - Your digital assets remain in your own filesystem, not on remote servers
   - You control your private keys locally, enhancing security
   - No reliance on marketplace platforms that could shut down or change policies
   - Assets can be managed offline without internet connectivity

2. **Reduced Financial Barriers**
   - No blockchain gas fees required to create or transfer assets
   - No marketplace commissions on creation or sales
   - Optional path to blockchain - move assets to chains only when desired
   - Avoid cryptocurrency volatility until you choose to enter that ecosystem

3. **Enhanced Privacy**
   - No requirement to connect wallets to marketplaces
   - Selective disclosure of ownership information
   - No public blockchain record unless you explicitly choose to create one
   - Your collection remains private by default

4. **Verifiable Authenticity Without Blockchain**
   - Assets are cryptographically signed using Ed25519 signatures
   - Ownership can be verified without blockchain transactions
   - Social media ownership verification through steganographic watermarking
   - Provenance tracking works even when images are shared off-platform

5. **Technical Innovation**
   - Leverages modern browser capabilities (File System Access API)
   - Uses Lit Protocol for decentralized key management and access control
   - WebAssembly implementation provides near-native performance
   - Designed with graceful fallbacks for compatibility across environments

6. **Future-Proof Design**
   - Blockchain-ready when you need it
   - Assets can be registered on blockchains at any point
   - Clear upgrade path to more decentralized systems
   - Not locked into any specific blockchain ecosystem

7. **Ownership Beyond the Marketplace**
   - Social media verification tools protect your assets "in the wild"
   - Perceptual hashing detects similar/copied images even after modifications
   - Public-facing verification tools allow anyone to check authenticity
   - Maintains verifiable provenance even outside controlled environments

WASI-NFT provides a fundamentally different approach to digital asset management by focusing on user ownership first and blockchain integration second, inverting the typical NFT marketplace model that puts the blockchain at the center of the experience.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [GoogleChromeLabs/wasi-fs-access](https://github.com/GoogleChromeLabs/wasi-fs-access) for the filesystem access functionality
- The WebAssembly and WASI communities for enabling powerful browser capabilities