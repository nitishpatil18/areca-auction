import hre from 'hardhat';

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('deploying with', deployer.address);

  const Factory = await hre.ethers.getContractFactory('ArecaAuction');
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('ArecaAuction deployed to:', address);
  console.log('\nadd this to your backend/.env and frontend/.env:');
  console.log(`CONTRACT_ADDRESS=${address}`);
  console.log(`VITE_CONTRACT_ADDRESS=${address}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});