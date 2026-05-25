// structured json-line logger.
//
// usage:
//   logger.info('chain connected', { contract: '0x...' })
//   logger.error('settlement failed', { auctionId, reason })
//
// each call emits exactly one json line to stdout/stderr. easy to grep,
// pipe into jq, ship to log aggregators, or read raw.
function emit(level, msg, context) {
  // silent in tests to keep test output clean
  if (process.env.NODE_ENV === 'test') return;
  const line = {
    level,
    ts: new Date().toISOString(),
    msg,
    ...(context && typeof context === 'object' ? context : {}),
  };
  const out = JSON.stringify(line);
  if (level === 'error' || level === 'warn') {
    process.stderr.write(out + '\n');
  } else {
    process.stdout.write(out + '\n');
  }
}

export const logger = {
  info:  (msg, ctx) => emit('info',  msg, ctx),
  warn:  (msg, ctx) => emit('warn',  msg, ctx),
  error: (msg, ctx) => emit('error', msg, ctx),
  debug: (msg, ctx) => {
    if (process.env.NODE_ENV !== 'production') emit('debug', msg, ctx);
  },
};
