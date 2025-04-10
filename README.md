# WASI-NFT: Filesystem Digital Assets

A browser-based application for creating, managing, and verifying unique digital assets stored directly in your filesystem. Built with the [WASI-fs-access](https://github.com/GoogleChromeLabs/wasi-fs-access) technology for secure filesystem access from the browser and [Lit Protocol](https://litprotocol.com/) for decentralized access control and key management.

## Features

- **Create Digital Assets**: Import images, videos, audio, or other files as unique digital assets
- **Cryptographic Verification**: Each asset is cryptographically signed and can be verified for authenticity
- **Local Storage**: All assets and metadata are stored in your own filesystem
- **Export & Share**: Export assets for sharing with others
- **Import Verification**: Verify and import assets shared by others
- **Blockchain Ready**: Optional bridge to register assets on blockchain networks
- **Compressed NFTs**: Efficient on-chain representation of large asset collections
- **AI Data NFTs**: Specialized support for AI training and research datasets

## How It Works

This application leverages modern web technologies to create a hybrid approach to digital assets:

1. **File System Access API**: Allows direct access to your filesystem from the browser
2. **WebAssembly (WASI)**: Provides near-native performance for cryptographic operations
3. **Ed25519 Signatures**: Cryptographically signs each asset to ensure authenticity
4. **Local-First Architecture**: Everything works offline with assets under your control
5. **Optional Blockchain Bridge**: Register selected assets on blockchains when desired
6. **Merkle Tree Compression**: Efficiently represent large collections with minimal on-chain storage
7. **AI Data Attribution**: Specialized metadata and verification for AI training datasets

## AI Data NFT Support

WASI-NFT provides specialized support for AI training and research data:

### Features

- **AI Dataset Creation**: Create and manage collections of training data with appropriate metadata
- **Data Provenance**: Cryptographically verify the source and authenticity of AI training data
- **Compressed Data NFTs**: Efficiently register large datasets on blockchains at minimal cost
- **Attribution Tracking**: Track usage of data in AI models with proper attribution
- **Licensing Controls**: Specify and enforce usage permissions for AI training data

### Use Cases

- **AI Training Data Markets**: Create verifiable marketplaces for high-quality training data
- **Research Data Sharing**: Share research datasets with provenance guarantees
- **Model Attribution**: Track which datasets were used to train specific AI models
- **Data Quality Verification**: Verify the integrity and origins of datasets

### Implementation

The AI Data NFT system uses our compressed NFT technology to efficiently represent large datasets as collections. This allows for:

1. **Off-chain Storage**: Data is primarily stored in the user's filesystem
2. **On-chain Verification**: Only the Merkle root and minimal verification data goes on-chain
3. **Proof of Inclusion**: Verify individual data items are part of a larger dataset
4. **Efficient Transfers**: Transfer ownership of entire datasets with a single transaction

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

## Blockchain Usage

- Full blockchain integration for Avalanche
- IPFS integration for decentralized storage
- Marketplace connector for listing assets on popular NFT marketplaces
- Enhanced metadata standards compatibility
- Multi-user features and collaboration tools


### Core Purpose

WASI-NFT is designed to bridge the gap between traditional files and blockchain NFTs by providing a user-controlled system for digital asset ownership and verification without requiring immediate blockchain integration.

### Key Advantages:

WASI-NFT provides a fundamentally different approach to digital asset management by focusing on user ownership first and blockchain integration second, inverting the typical NFT marketplace model that puts the blockchain at the center of the experience.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under a proprietary license. All rights reserved.

**IMPORTANT**: This software is proprietary and confidential. Use is subject to the restrictions outlined in the LICENSE file. The blockchain-based data attribution and tokenization mechanisms are protected intellectual property and may not be implemented or replicated without explicit written permission.

## Acknowledgments

- [GoogleChromeLabs/wasi-fs-access](https://github.com/GoogleChromeLabs/wasi-fs-access) for the filesystem access functionality
- The WebAssembly and WASI communities for enabling powerful browser capabilities