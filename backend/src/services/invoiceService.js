import PDFDocument from 'pdfkit';
import { PassThrough } from 'node:stream';

/**
 * generates an invoice pdf and returns a stream the caller can pipe to res.
 * data shape:
 *   {
 *     invoiceNumber, settledAt,
 *     lot: { variety, grade, weightKg, region, moisturePct },
 *     auction: { _id, currentBidPerKg, finalAmount, onChainAuctionId, createTxHash },
 *     farmer: { name, email, region },
 *     winner: { name, email, region },
 *   }
 */
export function buildInvoicePDF(data) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = new PassThrough();
  doc.pipe(stream);

  const { invoiceNumber, settledAt, lot, auction, farmer, winner } = data;

  // header
  doc.fillColor('#059669').font('Helvetica-Bold').fontSize(28).text('Areca Auction', 50, 50);
  doc.fontSize(10).fillColor('#64748b').font('Helvetica').text('settlement invoice', 50, 82);
  doc.fontSize(9).fillColor('#94a3b8').text('arecanut-auction.local · Bengaluru, KA', 50, 96);

  // invoice meta box (right)
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text('INVOICE', 400, 50, { align: 'right', width: 145 });
  doc.font('Helvetica').fillColor('#64748b').fontSize(9);
  doc.text(`#${invoiceNumber}`, 400, 70, { align: 'right', width: 145 });
  doc.text(`issued ${new Date(settledAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}`, 400, 84, { align: 'right', width: 145 });

  // divider
  doc.moveTo(50, 130).lineTo(545, 130).strokeColor('#e2e8f0').stroke();

  // parties
  doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(9).text('FROM (FARMER)', 50, 150);
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text(farmer.name, 50, 165);
  doc.font('Helvetica').fillColor('#475569').fontSize(10);
  doc.text(farmer.email, 50, 182);
  if (farmer.region) doc.text(farmer.region, 50, 196);

  doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(9).text('TO (WINNING BUYER)', 310, 150);
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text(winner.name, 310, 165);
  doc.font('Helvetica').fillColor('#475569').fontSize(10);
  doc.text(winner.email, 310, 182);
  if (winner.region) doc.text(winner.region, 310, 196);

  // lot table
  let y = 240;
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text('lot details', 50, y);
  y += 22;

  // table header
  doc.rect(50, y, 495, 24).fillColor('#f1f5f9').fill();
  doc.fillColor('#475569').font('Helvetica-Bold').fontSize(9);
  doc.text('item',         60,  y + 8);
  doc.text('grade',       240,  y + 8);
  doc.text('weight',      300,  y + 8);
  doc.text('rate',        370,  y + 8, { width: 80, align: 'right' });
  doc.text('amount',      460,  y + 8, { width: 80, align: 'right' });
  y += 24;

  // table row
  doc.fillColor('#0f172a').font('Helvetica').fontSize(10);
  doc.text(`${lot.variety} arecanut`,                          60,  y + 10);
  doc.font('Helvetica-Bold').text(lot.grade,                 240,  y + 10);
  doc.font('Helvetica').text(`${lot.weightKg} kg`,           300,  y + 10);
  doc.text(`₹${auction.currentBidPerKg}/kg`,                 370,  y + 10, { width: 80, align: 'right' });
  doc.font('Helvetica-Bold').text(`₹${auction.finalAmount.toLocaleString('en-IN')}`,
                                                              460,  y + 10, { width: 80, align: 'right' });

  if (lot.moisturePct != null || lot.region) {
    doc.fillColor('#64748b').font('Helvetica').fontSize(8);
    const meta = [
      lot.region && `region: ${lot.region}`,
      lot.moisturePct != null && `moisture: ${lot.moisturePct}%`,
    ].filter(Boolean).join(' · ');
    doc.text(meta, 60, y + 28);
  }
  y += 50;

  // bottom line
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#e2e8f0').stroke();
  y += 16;

  // total
  doc.fillColor('#475569').font('Helvetica').fontSize(10);
  doc.text('subtotal',                                          340, y, { width: 130, align: 'right' });
  doc.fillColor('#0f172a').font('Helvetica-Bold').text(`₹${auction.finalAmount.toLocaleString('en-IN')}`,
                                                                480, y, { width: 60,  align: 'right' });
  y += 18;
  doc.fillColor('#475569').font('Helvetica').text('platform fee', 340, y, { width: 130, align: 'right' });
  doc.fillColor('#0f172a').font('Helvetica').text('₹0',           480, y, { width: 60,  align: 'right' });
  y += 22;

  doc.rect(330, y, 215, 36).fillColor('#ecfdf5').fill();
  doc.fillColor('#065f46').font('Helvetica-Bold').fontSize(11).text('total',    340, y + 12, { width: 130, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(13).text(`₹${auction.finalAmount.toLocaleString('en-IN')}`,
                                                                480, y + 11, { width: 60, align: 'right' });
  y += 60;

  // blockchain proof block
  if (auction.onChainAuctionId || auction.createTxHash) {
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text('blockchain audit trail', 50, y);
    y += 18;

    doc.rect(50, y, 495, 60).fillColor('#f8fafc').fill();
    doc.fillColor('#475569').font('Helvetica').fontSize(9);
    if (auction.onChainAuctionId) {
      doc.font('Helvetica-Bold').text('on-chain auction id:', 60, y + 12);
      doc.font('Courier').text(`#${auction.onChainAuctionId}`, 200, y + 12);
    }
    if (auction.createTxHash) {
      doc.font('Helvetica-Bold').text('creation tx hash:', 60, y + 30);
      doc.font('Courier').fontSize(8).text(auction.createTxHash, 200, y + 30, { width: 335 });
    }
    doc.font('Helvetica-Oblique').fontSize(8).fillColor('#94a3b8')
       .text('this auction is recorded on the ethereum blockchain. the hash above is permanent and verifiable.',
             60, y + 48, { width: 475 });
    y += 80;
  }

  // footer
  doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
     .text('this invoice is automatically generated upon auction settlement.', 50, 760, { width: 495, align: 'center' })
     .text(`auction ref: ${auction._id} · generated ${new Date().toISOString()}`, 50, 772, { width: 495, align: 'center' });

  doc.end();
  return stream;
}