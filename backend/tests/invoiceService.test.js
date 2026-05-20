import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import { buildInvoicePDF } from '../src/services/invoiceService.js';

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function baseData(overrides = {}) {
  return {
    invoiceNumber: 'INV-2026-001',
    settledAt: new Date('2026-05-20T10:00:00Z'),
    lot: {
      variety: 'Bette', grade: 'A', weightKg: 100,
      region: 'Shivamogga', moisturePct: 10,
    },
    auction: {
      _id: '6a0c2fb934327b946fcc99cd',
      currentBidPerKg: 80,
      finalAmount: 8000,
      onChainAuctionId: null,
      createTxHash: null,
    },
    farmer: { name: 'Pramod', email: 'p@x.com', region: 'Gokak' },
    winner: { name: 'Satyan', email: 's@x.com', region: 'Mysore' },
    ...overrides,
  };
}

describe('invoiceService.buildInvoicePDF', () => {
  it('returns a readable stream', () => {
    const stream = buildInvoicePDF(baseData());
    expect(stream).toBeInstanceOf(Readable);
  });

  it('produces a non-empty pdf (starts with %PDF- magic bytes)', async () => {
    const buf = await streamToBuffer(buildInvoicePDF(baseData()));
    expect(buf.length).toBeGreaterThan(0);
    expect(buf.slice(0, 5).toString()).toBe('%PDF-');
  });

  it('does not crash when chain fields are absent', async () => {
    const buf = await streamToBuffer(buildInvoicePDF(baseData({
      auction: {
        _id: 'x', currentBidPerKg: 80, finalAmount: 8000,
        onChainAuctionId: null, createTxHash: null,
      },
    })));
    expect(buf.length).toBeGreaterThan(0);
  });

  it('does not crash when chain fields are present', async () => {
    const buf = await streamToBuffer(buildInvoicePDF(baseData({
      auction: {
        _id: 'x', currentBidPerKg: 80, finalAmount: 8000,
        onChainAuctionId: 42, createTxHash: '0xabc123',
      },
    })));
    expect(buf.length).toBeGreaterThan(0);
  });

  it('does not crash when optional lot fields are missing', async () => {
    const buf = await streamToBuffer(buildInvoicePDF(baseData({
      lot: {
        variety: 'Bette', grade: 'A', weightKg: 100,
        region: 'Shivamogga', moisturePct: null,
      },
    })));
    expect(buf.length).toBeGreaterThan(0);
  });
});
