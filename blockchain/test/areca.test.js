import { expect } from 'chai';
import hre from 'hardhat';

const { ethers } = hre;

describe('ArecaAuction', () => {
  let contract, seller, bidder1, bidder2;

  beforeEach(async () => {
    [seller, bidder1, bidder2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('ArecaAuction', seller);
    contract = await Factory.deploy();
    await contract.waitForDeployment();
  });

  async function createAuction(durationSeconds = 60, basePrice = ethers.parseEther('1')) {
    const block = await ethers.provider.getBlock('latest');
    const endTime = block.timestamp + durationSeconds;
    const tx = await contract.connect(seller).createAuction(basePrice, endTime);
    await tx.wait();
    return { id: 1n, endTime, basePrice };
  }

  it('creates an auction', async () => {
    const { id, basePrice } = await createAuction();
    const a = await contract.getAuction(id);
    expect(a.seller).to.equal(seller.address);
    expect(a.basePrice).to.equal(basePrice);
    expect(a.highestBid).to.equal(0n);
    expect(a.closed).to.equal(false);
  });

  it('rejects bids below base price', async () => {
    const { id, basePrice } = await createAuction();
    await expect(
      contract.connect(bidder1).placeBid(id, { value: basePrice - 1n })
    ).to.be.revertedWith('bid too low');
  });

  it('accepts a valid bid', async () => {
    const { id, basePrice } = await createAuction();
    await expect(
      contract.connect(bidder1).placeBid(id, { value: basePrice })
    ).to.emit(contract, 'BidPlaced').withArgs(id, bidder1.address, basePrice);

    const a = await contract.getAuction(id);
    expect(a.highestBid).to.equal(basePrice);
    expect(a.highestBidder).to.equal(bidder1.address);
  });

  it('rejects a bid not higher than current', async () => {
    const { id, basePrice } = await createAuction();
    await contract.connect(bidder1).placeBid(id, { value: basePrice });
    await expect(
      contract.connect(bidder2).placeBid(id, { value: basePrice })
    ).to.be.revertedWith('bid too low');
  });

  it('refunds previous high bidder via pendingReturns', async () => {
    const { id, basePrice } = await createAuction();
    await contract.connect(bidder1).placeBid(id, { value: basePrice });

    const newBid = basePrice + ethers.parseEther('0.5');
    await contract.connect(bidder2).placeBid(id, { value: newBid });

    expect(await contract.pendingReturns(bidder1.address)).to.equal(basePrice);
  });

  it('lets a refunded bidder withdraw', async () => {
    const { id, basePrice } = await createAuction();
    await contract.connect(bidder1).placeBid(id, { value: basePrice });
    await contract.connect(bidder2).placeBid(id, { value: basePrice + ethers.parseEther('0.5') });

    const before = await ethers.provider.getBalance(bidder1.address);
    const tx = await contract.connect(bidder1).withdraw();
    const receipt = await tx.wait();
    const gas = receipt.gasUsed * receipt.gasPrice;
    const after = await ethers.provider.getBalance(bidder1.address);

    expect(after + gas - before).to.equal(basePrice);
    expect(await contract.pendingReturns(bidder1.address)).to.equal(0n);
  });

  it('rejects bids from the seller', async () => {
    const { id, basePrice } = await createAuction();
    await expect(
      contract.connect(seller).placeBid(id, { value: basePrice })
    ).to.be.revertedWith('seller cannot bid');
  });

  it('rejects close before end time', async () => {
    const { id } = await createAuction(3600);
    await expect(
      contract.connect(seller).closeAuction(id)
    ).to.be.revertedWith('not yet');
  });

  it('closes after end time and pays seller', async () => {
    const { id, basePrice } = await createAuction(60);
    await contract.connect(bidder1).placeBid(id, { value: basePrice });

    await ethers.provider.send('evm_increaseTime', [61]);
    await ethers.provider.send('evm_mine', []);

    const before = await ethers.provider.getBalance(seller.address);
    const tx = await contract.connect(bidder1).closeAuction(id);
    await tx.wait();
    const after = await ethers.provider.getBalance(seller.address);

    expect(after - before).to.equal(basePrice);

    const a = await contract.getAuction(id);
    expect(a.closed).to.equal(true);
  });

  it('rejects bids on a closed auction', async () => {
    const { id, basePrice } = await createAuction(60);
    await contract.connect(bidder1).placeBid(id, { value: basePrice });

    await ethers.provider.send('evm_increaseTime', [61]);
    await ethers.provider.send('evm_mine', []);
    await contract.connect(seller).closeAuction(id);

    await expect(
      contract.connect(bidder2).placeBid(id, { value: basePrice + 1n })
    ).to.be.revertedWith('closed');
  });
});