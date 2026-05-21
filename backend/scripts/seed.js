/**
 * seed script for areca-auction.
 *
 * generates demo data for review/presentation. reseedable: re-running
 * drops only seeded records (tagged with isSeeded: true on user, lot,
 * auction, bid). real demo accounts (without the flag) are preserved.
 *
 * usage (inside container):
 *   docker exec areca-backend node scripts/seed.js
 *
 * usage (host):
 *   cd backend && node scripts/seed.js
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import User from '../src/models/User.js';
import Lot from '../src/models/Lot.js';
import Auction from '../src/models/Auction.js';
import Bid from '../src/models/Bid.js';
import Transaction from '../src/models/Transaction.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/areca';
const DEMO_PASSWORD = 'demo1234';

const REGIONS = [
  'Shivamogga', 'Sirsi', 'Sagara', 'Mysore',
  'Mangalore', 'Hassan', 'Hubli', 'Mandya',
];
const VARIETIES = ['Bette', 'Rashi', 'Sippe', 'Other'];
const GRADES = ['A', 'B', 'C'];

// price floor/ceiling per variety+grade for realistic seeded prices
function basePriceFor(variety, grade, region) {
  const varietyBase = {
    Bette: 480, Rashi: 420, Sippe: 380, Other: 350,
  }[variety];
  const gradeMul = { A: 1.0, B: 0.85, C: 0.7 }[grade];
  const regionBoost = {
    Shivamogga: 1.05, Sirsi: 1.03, Sagara: 1.02,
    Mysore: 1.0, Mangalore: 0.98, Hassan: 0.97,
    Hubli: 0.92, Mandya: 0.95,
  }[region];
  return Math.round(varietyBase * gradeMul * regionBoost);
}

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function daysAgo(days) { return new Date(Date.now() - days * 86_400_000); }

async function clearSeeded() {
  console.log('[seed] clearing previous seeded data...');
  const seededUsers = await User.find({ isSeeded: true }, '_id').lean();
  const seededIds = seededUsers.map((u) => u._id);
  await Bid.deleteMany({ bidder: { $in: seededIds } });
  await Auction.deleteMany({ farmer: { $in: seededIds } });
  await Lot.deleteMany({ farmer: { $in: seededIds } });
  await Transaction.deleteMany({ user: { $in: seededIds } });
  await User.deleteMany({ isSeeded: true });
  console.log(`[seed] removed ${seededIds.length} seeded users + their data`);
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const farmers = [
    { name: 'Ravi Hegde',    email: 'ravi@demo.com',    region: 'Shivamogga' },
    { name: 'Suresh Bhat',   email: 'suresh@demo.com',  region: 'Sirsi'      },
    { name: 'Mahesh Naik',   email: 'mahesh@demo.com',  region: 'Sagara'     },
    { name: 'Prakash Gowda', email: 'prakash@demo.com', region: 'Mysore'     },
    { name: 'Ganesh Shetty', email: 'ganesh@demo.com',  region: 'Mangalore'  },
  ];

  const buyers = [
    { name: 'Arun Kumar',    email: 'arun@demo.com',    region: 'Bengaluru' },
    { name: 'Vinod Rao',     email: 'vinod@demo.com',   region: 'Bengaluru' },
    { name: 'Rajeev Iyer',   email: 'rajeev@demo.com',  region: 'Mumbai'    },
    { name: 'Sandeep Shah',  email: 'sandeep@demo.com', region: 'Pune'      },
    { name: 'Karthik Menon', email: 'karthik@demo.com', region: 'Chennai'   },
    { name: 'Deepak Joshi',  email: 'deepak@demo.com',  region: 'Hyderabad' },
    { name: 'Manoj Pillai',  email: 'manoj@demo.com',   region: 'Kochi'     },
    { name: 'Anand Verma',   email: 'anand@demo.com',   region: 'Delhi'     },
    { name: 'Rohit Sharma',  email: 'rohit@demo.com',   region: 'Bengaluru' },
    { name: 'Vikram Singh',  email: 'vikram@demo.com',  region: 'Mumbai'    },
    { name: 'Naveen Kamath', email: 'naveen@demo.com',  region: 'Mangalore' },
    { name: 'Sachin Patil',  email: 'sachin@demo.com',  region: 'Pune'      },
    { name: 'Ajay Reddy',    email: 'ajay@demo.com',    region: 'Hyderabad' },
    { name: 'Tarun Desai',   email: 'tarun@demo.com',   region: 'Bengaluru' },
    { name: 'Nikhil Bose',   email: 'nikhil@demo.com',  region: 'Kolkata'   },
  ];

  const admin = { name: 'Admin', email: 'admin@demo.com', region: 'Bengaluru' };

  const createdFarmers = await User.insertMany(
    farmers.map((f) => ({ ...f, passwordHash, role: 'farmer', walletBalance: 0, isSeeded: true })),
  );
  const createdBuyers = await User.insertMany(
    buyers.map((b) => ({ ...b, passwordHash, role: 'buyer', walletBalance: 1_000_000, isSeeded: true })),
  );
  const createdAdmin = await User.create({ ...admin, passwordHash, role: 'admin', isSeeded: true });

  console.log(`[seed] users: ${createdFarmers.length} farmers, ${createdBuyers.length} buyers, 1 admin`);
  return { farmers: createdFarmers, buyers: createdBuyers, admin: createdAdmin };
}

async function seedListedLots(farmers) {
  // 6 listed lots: visible on browse page, ready for new auctions
  const lots = [];
  for (let i = 0; i < 6; i++) {
    const farmer = farmers[i % farmers.length];
    const variety = pick(VARIETIES);
    const grade = pick(GRADES);
    lots.push({
      farmer: farmer._id,
      variety, grade,
      weightKg: pick([50, 75, 100, 150, 200]),
      basePricePerKg: basePriceFor(variety, grade, farmer.region),
      region: farmer.region,
      moisturePct: rand(8, 14),
      description: `${grade}-grade ${variety} arecanut from ${farmer.region}.`,
      status: 'listed',
      isSeeded: true,
    });
  }
  const created = await Lot.insertMany(lots);
  console.log(`[seed] listed lots: ${created.length}`);
  return created;
}

async function seedLiveAuctions(farmers, buyers) {
  // 4 live auctions: status=live, endAt 5-30 minutes in the future
  const out = [];
  for (let i = 0; i < 4; i++) {
    const farmer = farmers[(i + 1) % farmers.length];
    const variety = pick(VARIETIES);
    const grade = pick(GRADES);
    const weight = pick([60, 80, 100, 120, 180]);
    const base = basePriceFor(variety, grade, farmer.region);

    const lot = await Lot.create({
      farmer: farmer._id,
      variety, grade,
      weightKg: weight,
      basePricePerKg: base,
      region: farmer.region,
      moisturePct: rand(8, 14),
      description: `${grade}-grade ${variety}, freshly harvested.`,
      status: 'in_auction',
      isSeeded: true,
    });

    const minsAhead = rand(5, 30);
    const auction = await Auction.create({
      lot: lot._id,
      farmer: farmer._id,
      status: 'live',
      startAt: daysAgo(0.02),  // ~30 minutes ago
      endAt: new Date(Date.now() + minsAhead * 60_000),
      basePricePerKg: base,
      currentBidPerKg: base + rand(10, 60),
      highestBidder: pick(buyers)._id,
      bidCount: rand(2, 6),
      isSeeded: true,
    });
    out.push(auction);
  }
  console.log(`[seed] live auctions: ${out.length}`);
  return out;
}

async function seedClosedAuctions(farmers, buyers) {
  // 20 closed auctions over the last 90 days for analytics
  const out = [];
  for (let i = 0; i < 20; i++) {
    const farmer = pick(farmers);
    const variety = pick(VARIETIES);
    const grade = pick(GRADES);
    const weight = pick([50, 80, 100, 150, 200, 250]);
    const base = basePriceFor(variety, grade, farmer.region);

    const settled = daysAgo(rand(2, 88));
    const startedAt = new Date(settled.getTime() - rand(5, 120) * 60_000);

    const lot = await Lot.create({
      farmer: farmer._id,
      variety, grade,
      weightKg: weight,
      basePricePerKg: base,
      region: farmer.region,
      moisturePct: rand(8, 14),
      description: `${grade}-grade ${variety} arecanut.`,
      status: 'sold',
      isSeeded: true,
    });

    // 2-8 escalating bids
    const numBids = rand(2, 8);
    let lastPrice = base;
    const bidders = [];
    const bidDocs = [];
    for (let b = 0; b < numBids; b++) {
      const bidder = pick(buyers);
      lastPrice += rand(5, 25);
      bidDocs.push({
        auction: null,  // patched after auction is created
        bidder: bidder._id,
        pricePerKg: lastPrice,
        amountTotal: lastPrice * weight,
        createdAt: new Date(startedAt.getTime() + (b + 1) * 60_000 * rand(1, 5)),
        isSeeded: true,
      });
      bidders.push(bidder);
    }
    const winner = bidders[bidders.length - 1];
    const finalAmount = lastPrice * weight;

    const auction = await Auction.create({
      lot: lot._id,
      farmer: farmer._id,
      status: 'closed',
      startAt: startedAt,
      endAt: settled,
      settledAt: settled,
      basePricePerKg: base,
      currentBidPerKg: lastPrice,
      highestBidder: winner._id,
      bidCount: numBids,
      finalAmount,
      isSeeded: true,
    });

    // patch and insert bids
    bidDocs.forEach((b) => (b.auction = auction._id));
    await Bid.insertMany(bidDocs);

    out.push(auction);
  }
  console.log(`[seed] closed auctions: ${out.length}`);
  return out;
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('[seed] connected to mongo');

  await clearSeeded();

  const { farmers, buyers } = await seedUsers();
  await seedListedLots(farmers);
  await seedLiveAuctions(farmers, buyers);
  await seedClosedAuctions(farmers, buyers);

  console.log('[seed] done. all demo accounts use password:', DEMO_PASSWORD);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error('[seed] failed:', e);
  process.exit(1);
});
