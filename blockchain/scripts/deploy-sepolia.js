import hre from 'hardhat';

async function getGasCost(tx) {
  const receipt = await tx.wait();
  const gasUsed = receipt.gasUsed;
  const feeData = await hre.ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const costWei = gasUsed * gasPrice;
  const costETH = Number(costWei) / 1e18;
  return { gasUsed: gasUsed.toString(), costETH: costETH.toFixed(8) };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log("=== ArecaAuction Sepolia Gas Cost Measurement ===");

  const [deployer] = await hre.ethers.getSigners();
  const balanceBefore = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer: " + deployer.address);
  console.log("Balance:  " + (Number(balanceBefore) / 1e18).toFixed(6) + " ETH\n");

  // create a second wallet for bidding (seller cannot bid on own auction)
  const bidderWallet = hre.ethers.Wallet.createRandom().connect(hre.ethers.provider);
  console.log("Bidder (ephemeral): " + bidderWallet.address);

  // fund the bidder with enough ETH for bid + gas
  const fundTx = await deployer.sendTransaction({
    to: bidderWallet.address,
    value: hre.ethers.parseEther("0.005"),
  });
  await fundTx.wait();
  console.log("Funded bidder with 0.005 ETH\n");

  // 1. deploy
  console.log("1. Deploying ArecaAuction...");
  const Factory = await hre.ethers.getContractFactory('ArecaAuction');
  const contract = await Factory.deploy();
  const deployTx = contract.deploymentTransaction();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const deployGas = await getGasCost(deployTx);
  console.log("   Address:  " + address);
  console.log("   Gas used: " + deployGas.gasUsed);
  console.log("   Cost:     " + deployGas.costETH + " ETH");

  // 2. createAuction — endTime 90 seconds from now
  console.log("\n2. Simulating createAuction (deployer = seller)...");
  const endTime = Math.floor(Date.now() / 1000) + 90;
  const createTx = await contract.createAuction(350, endTime);
  const createGas = await getGasCost(createTx);
  const auctionId = 1n;
  console.log("   Auction ID: " + auctionId);
  console.log("   Gas used:   " + createGas.gasUsed);
  console.log("   Cost:       " + createGas.costETH + " ETH");

  // 3. placeBid — from bidder wallet (different from seller)
  console.log("\n3. Simulating placeBid (bidder = ephemeral wallet)...");
  const contractAsBidder = contract.connect(bidderWallet);
  const bidTx = await contractAsBidder.placeBid(auctionId, {
    value: hre.ethers.parseUnits("400", "wei"),
  });
  const bidGas = await getGasCost(bidTx);
  console.log("   Gas used: " + bidGas.gasUsed);
  console.log("   Cost:     " + bidGas.costETH + " ETH");

  // 4. wait for auction to end, then closeAuction
  console.log("\n4. Waiting 95 seconds for auction to end...");
  await sleep(95000);
  console.log("   Closing auction...");
  const closeTx = await contract.closeAuction(auctionId);
  const closeGas = await getGasCost(closeTx);
  console.log("   Gas used: " + closeGas.gasUsed);
  console.log("   Cost:     " + closeGas.costETH + " ETH");

  const balanceAfter = await hre.ethers.provider.getBalance(deployer.address);
  const totalSpent = (Number(balanceBefore) - Number(balanceAfter)) / 1e18;

  console.log("\n" + "=".repeat(55));
  console.log("  GAS COST SUMMARY (Sepolia Testnet)");
  console.log("=".repeat(55));
  console.log("Operation".padEnd(25) + "Gas Used".padEnd(12) + "Cost (ETH)");
  console.log("-".repeat(53));
  console.log("Contract Deploy".padEnd(25) + deployGas.gasUsed.padEnd(12) + deployGas.costETH);
  console.log("createAuction".padEnd(25)   + createGas.gasUsed.padEnd(12) + createGas.costETH);
  console.log("placeBid".padEnd(25)        + bidGas.gasUsed.padEnd(12)    + bidGas.costETH);
  console.log("closeAuction".padEnd(25)    + closeGas.gasUsed.padEnd(12)  + closeGas.costETH);
  console.log("-".repeat(53));
  console.log("Total ETH spent (deployer): " + totalSpent.toFixed(8) + " ETH");
  console.log("=".repeat(55));
  console.log("\nVerify on Etherscan:");
  console.log("https://sepolia.etherscan.io/address/" + address);
}

main().catch(e => { console.error(e); process.exit(1); });
