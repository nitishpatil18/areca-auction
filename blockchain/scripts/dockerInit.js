import hre from 'hardhat';
import fs from 'node:fs';
import path from 'node:path';

const SHARED = '/shared';
const ABI_OUT_DIR = path.join(SHARED, 'abi');
const ENV_OUT = path.join(SHARED, 'contract.env');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('[init] deploying with', deployer.address);

  const Factory = await hre.ethers.getContractFactory('ArecaAuction');
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log('[init] ArecaAuction deployed to:', address);

  // write abi to the shared volume
  const artifactPath = path.resolve('artifacts/contracts/ArecaAuction.sol/ArecaAuction.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  fs.mkdirSync(ABI_OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(ABI_OUT_DIR, 'ArecaAuction.json'),
    JSON.stringify({ abi: artifact.abi }, null, 2),
  );
  console.log('[init] wrote abi to', ABI_OUT_DIR);

  // write env file the backend entrypoint will source
  // account 0 private key is well-known for hardhat default mnemonic
  const ADMIN_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  const lines = [
    `CONTRACT_ADDRESS=${address}`,
    `ADMIN_PK=${ADMIN_PK}`,
    `RPC_URL=http://hardhat:8545`,
  ];
  fs.writeFileSync(ENV_OUT, lines.join('\n') + '\n');
  console.log('[init] wrote env to', ENV_OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
