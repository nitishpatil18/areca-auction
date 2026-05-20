import 'dotenv/config';
import '@nomicfoundation/hardhat-toolbox';

const RPC_URL    = process.env.ALCHEMY_OR_INFURA_RPC || '';
const DEPLOYER_PK = process.env.DEPLOYER_PK || '';

// for the deploy init container to reach the hardhat container over docker
const HARDHAT_RPC = process.env.HARDHAT_NETWORK_URL || 'http://hardhat:8545';

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: 'http://127.0.0.1:8545', chainId: 31337 },
    external: { url: HARDHAT_RPC, chainId: 31337 },
    ...(RPC_URL && DEPLOYER_PK
      ? { sepolia: { url: RPC_URL, accounts: [DEPLOYER_PK] } }
      : {}),
  },
};
