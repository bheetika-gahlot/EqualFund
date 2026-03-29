const hre  = require('hardhat');
const fs   = require('fs');
const path = require('path');

async function main() {
  console.log('🚀 Deploying EqualFund to Polygon Amoy...');

  const [deployer] = await hre.ethers.getSigners();
  console.log('Deployer:', deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log('Balance:', hre.ethers.formatEther(balance), 'MATIC');

  if (parseFloat(hre.ethers.formatEther(balance)) < 0.01) {
    console.error('❌ Not enough MATIC! Get free MATIC from: https://faucet.polygon.technology');
    process.exit(1);
  }

  const EqualFund = await hre.ethers.getContractFactory('EqualFund');
  const contract  = await EqualFund.deploy(deployer.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('✅ EqualFund deployed to:', address);

  // Save to frontend config
  const artifact   = await hre.artifacts.readArtifact('EqualFund');
  const configPath = path.join(__dirname, '../frontend/src/config/contract.json');

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify({
    address,
    chainId: 80002,
    network: 'amoy',
    abi:     artifact.abi,
  }, null, 2));

  console.log('📝 Contract config saved!');
  console.log('\n📋 Deployment Summary:');
  console.log('========================');
  console.log('Contract:', address);
  console.log('Network:  Polygon Amoy');
  console.log('ChainId:  80002');
  console.log('Explorer: https://amoy.polygonscan.com/address/' + address);
  console.log('========================');
}

main().catch(e => {
  console.error('❌ Deploy failed:', e.message);
  process.exit(1);
});
