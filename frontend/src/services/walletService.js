import { ethers } from 'ethers';
import contractConfig from '../config/contract.json';

export const walletService = {
  provider: null,
  signer:   null,
  contract: null,

  async connectWallet() {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed. Please install MetaMask.');
    }

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Please unlock MetaMask.');
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.signer   = await this.provider.getSigner();

    const network = await this.provider.getNetwork();
    const chainId = Number(network.chainId);

    // Switch to Sepolia if on wrong network
    if (chainId !== 11155111) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }], // Sepolia
        });
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer   = await this.provider.getSigner();
      } catch (err) {
        if (err.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia Test Network',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://eth-sepolia.g.alchemy.com/v2/t77AU4Uv0dOu6q3QKSa1e'],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            }],
          });
          this.provider = new ethers.BrowserProvider(window.ethereum);
          this.signer   = await this.provider.getSigner();
        }
      }
    }

    const contractAddress = contractConfig.address;
    this.contract = new ethers.Contract(contractAddress, contractConfig.abi, this.signer);

    console.log('✅ Connected to Sepolia:', accounts[0]);
    return accounts[0];
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