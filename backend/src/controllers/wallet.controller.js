import * as walletService from '../services/walletService.js';

export async function getStatus(req, res, next) {
  try {
    const status = await walletService.getWalletStatus(req.user.id);
    res.json(status);
  } catch (e) { next(e); }
}

export async function topUp(req, res, next) {
  try {
    const result = await walletService.topUp(req.user.id, req.body.amount);
    res.json(result);
  } catch (e) { next(e); }
}
export async function getTransactions(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const result = await walletService.getTransactions(req.user.id, { page, limit });
    res.json(result);
  } catch (e) { next(e); }
}
