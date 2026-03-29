require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

module.exports = {
  solidity: {
    version: '0.8.19',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat:   { chainId: 31337 },
    localhost: { url: 'http://127.0.0.1:8545', chainId: 31337 },
    sepolia: {
      url:      process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
      chainId:  11155111,
      accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY.replace('0x','')}`] : [],
    },
  },
};
