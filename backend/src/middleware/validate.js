import { badRequest } from '../utils/httpError.js';

// usage: router.post('/x', validate(schema), handler)
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });
    if (error) {
      return next(badRequest('validation failed', error.details.map(d => d.message)));
    }
    req[source] = value;
    next();
  };
}