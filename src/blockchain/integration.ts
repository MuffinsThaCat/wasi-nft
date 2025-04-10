import { ethers } from 'ethers';
import { BlockchainConfig, WalletInfo, TransferOptions, TransactionReceipt } from '../types/blockchain';

// Default configuration for blockchain networks
const defaultConfig: BlockchainConfig = {
  defaultNetwork: 'avalanche',
  networks: {
    avalanche: {
      chainId: 43114,
      name: 'Avalanche Mainnet C-Chain',
      rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
      explorerUrl: 'https://snowtrace.io'
    },
    ethereum: {
      chainId: 1,
      name: 'Ethereum Mainnet',
      rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
      explorerUrl: 'https://etherscan.io'
    },
    polygon: {
      chainId: 137,
      name: 'Polygon Mainnet',
      rpcUrl: 'https://polygon-rpc.com',
      explorerUrl: 'https://polygonscan.com'
    },
    optimism: {
      chainId: 10,
      name: 'Optimism',
      rpcUrl: 'https://mainnet.optimism.io',
      explorerUrl: 'https://optimistic.etherscan.io'
    },
    arbitrum: {
      chainId: 42161,
      name: 'Arbitrum One',
      rpcUrl: 'https://arb1.arbitrum.io/rpc',
      explorerUrl: 'https://arbiscan.io'
    },
    // Test networks
    fuji: {
      chainId: 43113,
      name: 'Avalanche Fuji Testnet',
      rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
      explorerUrl: 'https://testnet.snowtrace.io'
    },
    goerli: {
      chainId: 5,
      name: 'Goerli Testnet',
      rpcUrl: 'https://goerli.infura.io/v3/YOUR_INFURA_KEY',
      explorerUrl: 'https://goerli.etherscan.io'
    },
    mumbai: {
      chainId: 80001,
      name: 'Mumbai Testnet',
      rpcUrl: 'https://rpc-mumbai.maticvigil.com',
      explorerUrl: 'https://mumbai.polygonscan.com'
    }
  }
};

// Metadata Registry ABI - minimal interface for storing asset metadata
const metadataRegistryABI = [
  // Register a new asset with metadata
  'function registerAsset(string assetId, string contentHash, string metadataHash, string uri) returns (bool)',
  
  // Transfer ownership of an asset
  'function transferAsset(string assetId, address to) returns (bool)',
  
  // Batch register multiple assets
  'function batchRegister(string[] assetIds, string[] contentHashes, string[] metadataHashes, string[] uris) returns (bool)',
  
  // Batch transfer multiple assets
  'function batchTransfer(string[] assetIds, address to) returns (bool)',
  
  // Check if an asset exists
  'function assetExists(string assetId) view returns (bool)',
  
  // Get asset owner
  'function ownerOf(string assetId) view returns (address)',
  
  // Get asset metadata
  'function getAssetMetadata(string assetId) view returns (string contentHash, string metadataHash, string uri, address creator, uint256 timestamp, bool exists)',
  
  // Events
  'event AssetRegistered(string assetId, string contentHash, string metadataHash, string uri, address indexed creator, uint256 timestamp)',
  'event AssetTransferred(string assetId, address indexed from, address indexed to, uint256 timestamp)'
];

/**
 * BlockchainIntegration class provides methods for interacting with blockchain networks
 * for asset metadata registration and ownership transfers.
 */
export class BlockchainIntegration {
  private eventListeners = new Map<string, (event: any) => void>();
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private config: BlockchainConfig;
  private currentNetwork: string;
  private contracts: Record<string, ethers.Contract> = {};

  constructor(customConfig?: Partial<BlockchainConfig>) {
    this.config = { ...defaultConfig, ...customConfig };
    this.currentNetwork = this.config.defaultNetwork;
    
    // Initialize provider if window.ethereum is available
    this.initializeProvider();
  }

  /**
   * Initialize the Ethereum provider if available in the browser
   */
  private initializeProvider(): void {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
      console.log('Ethereum provider initialized');
    } else {
      console.warn('No Ethereum provider found. Wallet connection will not be available.');
    }
  }

  /**
   * Get the current configuration
   */
  public getConfig(): BlockchainConfig {
    return this.config;
  }

  /**
   * Update the blockchain configuration
   */
  public updateConfig(newConfig: Partial<BlockchainConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Set contract address for the current network
   */
  public setContractAddress(address: string): void {
    if (this.config.networks[this.currentNetwork]) {
      this.config.networks[this.currentNetwork].contractAddress = address;
    }
  }

  /**
   * Connect to a wallet
   */
  public async connectWallet(): Promise<WalletInfo> {
    if (!this.provider) {
      throw new Error('Ethereum provider not available');
    }

    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Get the signer
      this.signer = await this.provider.getSigner();
      
      // Get account address
      const address = await this.signer.getAddress();
      
      // Get network information
      const network = await this.provider.getNetwork();
      const chainId = network.chainId;
      
      // Get balance
      const balance = await this.provider.getBalance(address);
      
      // Find current network name
      let networkName = this.currentNetwork;
      for (const [name, networkConfig] of Object.entries(this.config.networks)) {
        if (networkConfig.chainId === Number(chainId)) {
          networkName = name;
          this.currentNetwork = name;
          break;
        }
      }
      
      const walletInfo: WalletInfo = {
        address,
        network: networkName,
        chainId: Number(chainId),
        balance: ethers.formatEther(balance)
      };
      
      return walletInfo;
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      throw new Error(`Failed to connect wallet: ${error.message}`);
    }
  }

  /**
   * Disconnect the current wallet
   */
  public disconnectWallet(): void {
    this.signer = null;
  }

  /**
   * Disconnect wallet from the integration
   */
  public disconnect(): void {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
  }
  
  /**
   * Gets the current connected wallet address
   * @returns The current wallet address
   */
  public async getCurrentAddress(): Promise<string> {
    if (!this.signer) {
      throw new Error('Not connected to a wallet');
    }
    return await this.signer.getAddress();
  }

  /**
   * Mints a new NFT with the given metadata
   * @param assetId The id of the asset
   * @param metadata The metadata of the NFT
   * @param ipfsUri The IPFS URI of the asset
   * @returns The transaction receipt
   */
  public async mintNFT(assetId: string, metadata: any, ipfsUri: string): Promise<string> {
    console.log(`Minting NFT for asset ${assetId} with URI ${ipfsUri}`);
    // Mock implementation - would call the NFT contract in production
    return `tx_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Lists an NFT on a marketplace
   * @param assetId The id of the asset
   * @param marketplaceId The id of the marketplace
   * @param price The price of the NFT
   * @returns The transaction receipt
   */
  public async listOnMarketplace(assetId: string, marketplaceId: string, price: string): Promise<string> {
    console.log(`Listing NFT ${assetId} on marketplace ${marketplaceId} for ${price}`);
    // Mock implementation - would call the marketplace contract in production
    return `tx_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Cancels a marketplace listing
   * @param listingId The id of the listing
   * @returns The transaction receipt
   */
  public async cancelMarketplaceListing(listingId: string): Promise<string> {
    console.log(`Cancelling listing ${listingId}`);
    // Mock implementation - would call the marketplace contract in production
    return `tx_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Subscribes to transfer events for a specific NFT
   * @param assetId The id of the asset
   * @param callback The callback to call when a transfer event is detected
   */
  public subscribeToTransferEvents(assetId: string, callback: (event: any) => void): void {
    console.log(`Subscribing to transfer events for asset ${assetId}`);
    // Mock implementation - would set up a real event listener in production
    
    // For testing, simulate a transfer event after 30 seconds
    setTimeout(() => {
      const mockEvent = {
        assetId,
        from: '0x123456789abcdef',
        to: '0x987654321fedcba',
        price: '1.5 ETH',
        timestamp: Date.now()
      };
      callback(mockEvent);
    }, 30000);
  }

  /**
   * Records a secure transfer on the blockchain
   * @param assetId The id of the asset
   * @param newOwner The address of the new owner
   * @param transferProof The proof of the transfer
   * @returns The transaction receipt
   */
  public async recordSecureTransfer(assetId: string, newOwner: string, transferProof: string): Promise<string> {
    console.log(`Recording secure transfer for asset ${assetId} to ${newOwner}`);
    // Mock implementation - would call the contract in production
    return `tx_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Confirms a sale on the blockchain
   * @param assetId The id of the asset
   * @param buyerAddress The address of the buyer
   * @param salePrice The price of the sale
   * @returns The transaction receipt
   */
  public async confirmSale(assetId: string, buyerAddress: string, salePrice: string): Promise<string> {
    console.log(`Confirming sale of asset ${assetId} to ${buyerAddress} for ${salePrice}`);
    // Mock implementation - would call the contract in production
    return `tx_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get the contract instance for the current network
   */
  private getContract(): ethers.Contract {
    const networkConfig = this.config.networks[this.currentNetwork];
    
    if (!networkConfig) {
      throw new Error(`Network ${this.currentNetwork} not found in configuration`);
    }
    
    if (!networkConfig.contractAddress) {
      throw new Error(`Contract address not set for network ${this.currentNetwork}`);
    }
    
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    
    // Check if we already have a contract instance for this network
    if (this.contracts[this.currentNetwork]) {
      return this.contracts[this.currentNetwork];
    }
    
    // Create a new contract instance
    const contract = new ethers.Contract(
      networkConfig.contractAddress,
      metadataRegistryABI,
      this.signer
    );
    
    this.contracts[this.currentNetwork] = contract;
    return contract;
  }

  /**
   * Register an asset on the blockchain
   */
  public async registerAsset(
    assetId: string,
    contentHash: string,
    metadataHash: string,
    uri: string
  ): Promise<TransactionReceipt> {
    const contract = this.getContract();
    
    try {
      const tx = await contract.registerAsset(assetId, contentHash, metadataHash, uri);
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }
      
      return {
        transactionHash: receipt.hash,
        blockNumber: Number(receipt.blockNumber),
        confirmations: Number(receipt.confirmations),
        status: Number(receipt.status),
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error: any) {
      console.error('Failed to register asset:', error);
      throw new Error(`Failed to register asset: ${error.message}`);
    }
  }

  /**
   * Register multiple assets in a batch
   */
  public async batchRegisterAssets(
    assetIds: string[],
    contentHashes: string[],
    metadataHashes: string[],
    uris: string[]
  ): Promise<TransactionReceipt> {
    const contract = this.getContract();
    
    try {
      const tx = await contract.batchRegister(assetIds, contentHashes, metadataHashes, uris);
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }
      
      return {
        transactionHash: receipt.hash,
        blockNumber: Number(receipt.blockNumber),
        confirmations: Number(receipt.confirmations),
        status: Number(receipt.status),
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error: any) {
      console.error('Failed to batch register assets:', error);
      throw new Error(`Failed to batch register assets: ${error.message}`);
    }
  }

  /**
   * Transfer ownership of an asset
   */
  public async transferAsset(
    assetId: string,
    to: string,
    options?: TransferOptions
  ): Promise<TransactionReceipt> {
    const contract = this.getContract();
    
    try {
      // Create transaction overrides if options are provided
      const overrides: any = {};
      if (options?.gasLimit) {
        overrides.gasLimit = ethers.parseUnits(options.gasLimit, 'wei');
      }
      if (options?.feeData?.maxFeePerGas) {
        overrides.maxFeePerGas = ethers.parseUnits(options.feeData.maxFeePerGas, 'gwei');
      }
      if (options?.feeData?.maxPriorityFeePerGas) {
        overrides.maxPriorityFeePerGas = ethers.parseUnits(options.feeData.maxPriorityFeePerGas, 'gwei');
      }
      if (options?.feeData?.gasPrice) {
        overrides.gasPrice = ethers.parseUnits(options.feeData.gasPrice, 'gwei');
      }
      
      const tx = await contract.transferAsset(assetId, to, overrides);
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }
      
      return {
        transactionHash: receipt.hash,
        blockNumber: Number(receipt.blockNumber),
        confirmations: Number(receipt.confirmations),
        status: Number(receipt.status),
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error: any) {
      console.error('Failed to transfer asset:', error);
      throw new Error(`Failed to transfer asset: ${error.message}`);
    }
  }

  /**
   * Transfer multiple assets in a batch
   */
  public async batchTransferAssets(
    assetIds: string[],
    to: string,
    options?: TransferOptions
  ): Promise<TransactionReceipt> {
    const contract = this.getContract();
    
    try {
      // Create transaction overrides if options are provided
      const overrides: any = {};
      if (options?.gasLimit) {
        overrides.gasLimit = ethers.parseUnits(options.gasLimit, 'wei');
      }
      if (options?.feeData?.maxFeePerGas) {
        overrides.maxFeePerGas = ethers.parseUnits(options.feeData.maxFeePerGas, 'gwei');
      }
      if (options?.feeData?.maxPriorityFeePerGas) {
        overrides.maxPriorityFeePerGas = ethers.parseUnits(options.feeData.maxPriorityFeePerGas, 'gwei');
      }
      if (options?.feeData?.gasPrice) {
        overrides.gasPrice = ethers.parseUnits(options.feeData.gasPrice, 'gwei');
      }
      
      const tx = await contract.batchTransfer(assetIds, to, overrides);
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }
      
      return {
        transactionHash: receipt.hash,
        blockNumber: Number(receipt.blockNumber),
        confirmations: Number(receipt.confirmations),
        status: Number(receipt.status),
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error: any) {
      console.error('Failed to batch transfer assets:', error);
      throw new Error(`Failed to batch transfer assets: ${error.message}`);
    }
  }

  /**
   * Check if an asset exists on the blockchain
   */
  public async assetExists(assetId: string): Promise<boolean> {
    const contract = this.getContract();
    
    try {
      return await contract.assetExists(assetId);
    } catch (error: any) {
      console.error('Failed to check if asset exists:', error);
      throw new Error(`Failed to check if asset exists: ${error.message}`);
    }
  }

  /**
   * Get the owner of an asset
   */
  public async ownerOf(assetId: string): Promise<string> {
    const contract = this.getContract();
    
    try {
      return await contract.ownerOf(assetId);
    } catch (error: any) {
      console.error('Failed to get asset owner:', error);
      throw new Error(`Failed to get asset owner: ${error.message}`);
    }
  }

  /**
   * Get asset metadata from the blockchain
   */
  public async getAssetMetadata(assetId: string): Promise<{
    contentHash: string;
    metadataHash: string;
    uri: string;
    creator: string;
    timestamp: number;
    exists: boolean;
  }> {
    const contract = this.getContract();
    
    try {
      const [contentHash, metadataHash, uri, creator, timestamp, exists] = 
        await contract.getAssetMetadata(assetId);
      
      return {
        contentHash,
        metadataHash,
        uri,
        creator,
        timestamp: Number(timestamp),
        exists
      };
    } catch (error: any) {
      console.error('Failed to get asset metadata:', error);
      throw new Error(`Failed to get asset metadata: ${error.message}`);
    }
  }

  /**
   * Send a payment transaction
   */
  public async sendPayment(
    to: string,
    amount: string,
    options?: TransferOptions
  ): Promise<TransactionReceipt> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    
    try {
      // Create transaction parameters
      const tx: any = {
        to,
        value: ethers.parseEther(amount)
      };
      
      if (options?.gasLimit) {
        tx.gasLimit = ethers.parseUnits(options.gasLimit, 'wei');
      }
      if (options?.feeData?.maxFeePerGas) {
        tx.maxFeePerGas = ethers.parseUnits(options.feeData.maxFeePerGas, 'gwei');
      }
      if (options?.feeData?.maxPriorityFeePerGas) {
        tx.maxPriorityFeePerGas = ethers.parseUnits(options.feeData.maxPriorityFeePerGas, 'gwei');
      }
      if (options?.feeData?.gasPrice) {
        tx.gasPrice = ethers.parseUnits(options.feeData.gasPrice, 'gwei');
      }
      
      const transaction = await this.signer.sendTransaction(tx);
      const receipt = await transaction.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }
      
      return {
        transactionHash: receipt.hash,
        blockNumber: Number(receipt.blockNumber),
        confirmations: Number(receipt.confirmations),
        status: Number(receipt.status),
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error: any) {
      console.error('Failed to send payment:', error);
      throw new Error(`Failed to send payment: ${error.message}`);
    }
  }

  /**
   * Get transaction URL for the explorer
   */
  public getTransactionUrl(txHash: string): string {
    const networkConfig = this.config.networks[this.currentNetwork];
    
    if (!networkConfig) {
      throw new Error(`Network ${this.currentNetwork} not found in configuration`);
    }
    
    return `${networkConfig.explorerUrl}/tx/${txHash}`;
  }

  /**
   * Get address URL for the explorer
   */
  public getAddressUrl(address: string): string {
    const network = this.config.networks[this.currentNetwork];
    return `${network.explorerUrl}/address/${address}`;
  }

  /**
   * Verify a transaction on the blockchain
   * @param txHash Transaction hash to verify
   * @returns Promise with verification result
   */
  async verifyTransaction(txHash: string): Promise<boolean> {
    if (!txHash) return false;
    
    try {
      // Initialize provider if not already done
      if (!this.provider) {
        this.initializeProvider();
      }
      
      if (!this.provider) {
        console.error('No provider available for transaction verification');
        return false;
      }
      
      // Get transaction receipt
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      // Check if transaction exists and was successful
      return receipt != null && receipt.status === 1;
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return false;
    }
  }
}

// Add Ethereum provider to window type
declare global {
  interface Window {
    ethereum: any;
  }
}
