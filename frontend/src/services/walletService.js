import { ethers } from 'ethers';
import contractConfig from '../config/contract.json';

const SEPOLIA = {
  chainId:            '0xaa36a7',
  chainName:          'Sepolia Test Network',
  nativeCurrency:     { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls:            ['https://eth-sepolia.g.alchemy.com/v2/t77AU4Uv0dOu6q3QKSa1e'],
  blockExplorerUrls:  ['https://sepolia.etherscan.io'],
};

export const walletService = {
  provider: null,
  signer:   null,
  contract: null,

  async connectWallet() {
    if (!window.ethereum) throw new Error('MetaMask not installed.');

    await window.ethereum.request({ method: 'eth_requestAccounts' });

    // Force Sepolia
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId !== SEPOLIA.chainId) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: SEPOLIA.chainId }],
        });
      } catch (err) {
        if (err.code === 4902 || err.code === -32603) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [SEPOLIA],
          });
        }
      }
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.signer   = await this.provider.getSigner();
    const address = await this.signer.getAddress();

    this.contract = new ethers.Contract(
      contractConfig.address,
      contractConfig.abi,
      this.signer
    );

    console.log('✅ Connected to Sepolia:', address);
    return address;
  },

  async getCurrentAccount() {
    if (!window.ethereum) return null;
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      return accounts[0] || null;
    } catch { return null; }
  },

  getContract() {
    if (!this.contract) throw new Error('Wallet not connected.');
    return this.contract;
  },

  async getBalance(address) {
    try {
      if (!this.provider) this.provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch { return '0'; }
  },

  formatAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  },

  onAccountChange(callback) {
    if (window.ethereum) window.ethereum.on('accountsChanged', callback);
  },

  onChainChange(callback) {
    if (window.ethereum) window.ethereum.on('chainChanged', callback);
  },

  removeListeners() {
    if (window.ethereum) {
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');
    }
  },
};
