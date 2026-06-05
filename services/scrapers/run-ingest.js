const { runWorker } = require('./worker');
runWorker().then(() => {
  console.log('=== INGESTION COMPLETED ===');
  process.exit(0);
}).catch(e => {
  console.error('INGESTION FAILED:', e);
  process.exit(1);
});
