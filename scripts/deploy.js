const hre = require('hardhat');
const fs  = require('fs');
const path = require('path');

async function main() {
  console.log('🚀 Deploying EqualFund contract...');

  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', hre.ethers.formatEther(balance), 'ETH');

  const EqualFund = await hre.ethers.getContractFactory('EqualFund');
  const contract  = await EqualFund.deploy(deployer.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('✅ EqualFund deployed to:', address);

  // Save to frontend
  const artifact    = await hre.artifacts.readArtifact('EqualFund');
  const configPath  = path.join(__dirname, '../frontend/src/config/contract.json');

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify({
    address,
    chainId: 31337,
    network: 'localhost',
    abi: artifact.abi,
  }, null, 2));

  console.log('📝 Contract config saved to frontend/src/config/contract.json');
  console.log('\n📋 Deployment Summary:');
  console.log('========================');
  console.log('Contract Address:', address);
  console.log('Network: localhost');
  console.log('Deployer:', deployer.address);
  console.log('========================');
}

main().catch((error) => {
  console.error('❌ Deployment failed:', error.message);
  process.exitCode = 1;
});
