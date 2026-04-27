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