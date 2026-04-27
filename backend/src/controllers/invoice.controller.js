import Auction from '../models/Auction.js';
import { buildInvoicePDF } from '../services/invoiceService.js';
import { notFound, badRequest, forbidden } from '../utils/httpError.js';

export async function downloadInvoice(req, res, next) {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate('lot')
      .populate('farmer', 'name email region')
      .populate('highestBidder', 'name email region');

    if (!auction) throw notFound('auction not found');
    if (auction.status !== 'closed') throw badRequest('invoice only available for closed auctions');
    if (!auction.finalAmount || auction.finalAmount <= 0) {
      throw badRequest('this auction had no winning bid; no invoice');
    }

    // access control: only farmer, winner, or admin
    const userId = req.user.id;
    const role = req.user.role;
    const isFarmer = auction.farmer._id.toString() === userId;
    const isWinner = auction.highestBidder?._id.toString() === userId;
    if (role !== 'admin' && !isFarmer && !isWinner) {
      throw forbidden('not authorized to view this invoice');
    }

    const invoiceNumber = `AA-${auction._id.toString().slice(-8).toUpperCase()}`;

    const stream = buildInvoicePDF({
      invoiceNumber,
      settledAt: auction.settledAt || auction.updatedAt,
      lot: auction.lot,
      auction: {
        _id: auction._id.toString(),
        currentBidPerKg: auction.currentBidPerKg,
        finalAmount: auction.finalAmount,
        onChainAuctionId: auction.onChainAuctionId,
        createTxHash: auction.createTxHash,
      },
      farmer: auction.farmer,
      winner: auction.highestBidder,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceNumber}.pdf"`);
    stream.pipe(res);
  } catch (e) { next(e); }
}