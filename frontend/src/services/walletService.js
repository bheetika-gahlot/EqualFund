import { ethers } from 'ethers';
import contractConfig from '../config/contract.json';

export const walletService = {
  provider: null,
  signer:   null,
  contract: null,

  async connectWallet() {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed. Please install MetaMask.');
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
    console.log('Connected chainId:', chainId);

    // Switch to Hardhat if on wrong network
    if (chainId !== 31337) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x7a69' }], // 31337 in hex
        });
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer   = await this.provider.getSigner();
      } catch (err) {
        if (err.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x7a69',
              chainName: 'Hardhat Local',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['http://127.0.0.1:8545'],
              blockExplorerUrls: [],
            }],
          });
          this.provider = new ethers.BrowserProvider(window.ethereum);
          this.signer   = await this.provider.getSigner();
        } else {
          throw err;
        }
      }
    }

    const contractAddress = contractConfig.address || contractConfig.contractAddress;
    if (!contractAddress) {
      throw new Error('Contract address not found. Run: npx hardhat run scripts/deploy.js --network localhost');
    }

    this.contract = new ethers.Contract(
      contractAddress,
      contractConfig.abi,
      this.signer
    );

    console.log('✅ Wallet connected:', accounts[0]);
    console.log('✅ Contract:', contractAddress);

    return accounts[0];
  },

  async getCurrentAccount() {
    if (!window.ethereum) return null;
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      return accounts[0] || null;
    } catch (e) {
      return null;
    }
  },

  getContract() {
    if (!this.contract) throw new Error('Wallet not connected.');
    return this.contract;
  },

  async getBalance(address) {
    try {
      if (!this.provider) {
        this.provider = new ethers.BrowserProvider(window.ethereum);
      }
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (e) {
      console.warn('Balance fetch failed:', e.message);
      return '0';
    }
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
