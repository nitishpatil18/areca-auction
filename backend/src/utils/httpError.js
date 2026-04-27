export class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest   = (m, d) => new HttpError(400, m, d);
export const unauthorized = (m = 'unauthorized') => new HttpError(401, m);
export const forbidden    = (m = 'forbidden') => new HttpError(403, m);
export const notFound     = (m = 'not found') => new HttpError(404, m);
export const conflict     = (m, d) => new HttpError(409, m, d);