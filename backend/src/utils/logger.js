const ts = () => new Date().toISOString();

export const logger = {
  info:  (m) => console.log(`[${ts()}] INFO  ${m}`),
  warn:  (m) => console.warn(`[${ts()}] WARN  ${m}`),
  error: (m) => console.error(`[${ts()}] ERROR ${m}`),
  debug: (m) => process.env.NODE_ENV !== 'production' && console.log(`[${ts()}] DEBUG ${m}`),
};