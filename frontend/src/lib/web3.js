import { ethers } from 'ethers';
import abiData from '../abi/ArecaAuction.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 31337);

export function hasMetaMask() {
  return typeof window !== 'undefined' && Boolean(window.ethereum);
}

export async function connectWallet() {
  if (!hasMetaMask()) throw new Error('metamask not found. install it from metamask.io');

  const provider = new ethers.BrowserProvider(window.ethereum);
  // request access
  await provider.send('eth_requestAccounts', []);

  const network = await provider.getNetwork();
  if (Number(network.chainId) !== CHAIN_ID) {
    // try to switch
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x' + CHAIN_ID.toString(16) }],
      });
    } catch (e) {
      // chain not added in metamask — add it
      if (e.code === 4902 && CHAIN_ID === 31337) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x7a69',
            chainName: 'Hardhat Local',
            rpcUrls: ['http://127.0.0.1:8545'],
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
          }],
        });
      } else {
        throw new Error(`wrong network. switch metamask to chainId ${CHAIN_ID}`);
      }
    }
  }

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, abiData.abi, signer);

  return { provider, signer, contract, address };
}

export async function getReadOnlyContract() {
  // for view calls without metamask
  if (!CONTRACT_ADDRESS) return null;
  const provider = hasMetaMask()
    ? new ethers.BrowserProvider(window.ethereum)
    : new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  return new ethers.Contract(CONTRACT_ADDRESS, abiData.abi, provider);
}