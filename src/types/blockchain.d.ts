export interface BlockchainConfig {
  defaultNetwork: string;
  networks: {
    [key: string]: {
      chainId: number;
      name: string;
      contractAddress?: string;
      rpcUrl: string;
      explorerUrl: string;
    };
  };
}

export interface BlockchainReference {
  network: string;
  contractAddress: string;
  transactionHash: string;
  registeredAt: number;
}

export interface WalletInfo {
  address: string;
  network: string;
  chainId: number;
  balance: string;
}

export interface TransferOptions {
  recipient: string;
  amount?: string;
  gasLimit?: string;
  feeData?: {
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    gasPrice?: string;
  };
}

export interface BatchTransferParams {
  assetIds: string[];
  recipient: string;
  options?: TransferOptions;
}

export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  confirmations: number;
  status: number;
  gasUsed: string;
}
