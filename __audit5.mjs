const POOL = '0x062b914668f3fd35c3ae02e699cb82e1cf4be18b';
const VBMS = '0xF14C1dC8Ce5fE65413379F76c43fA1460C31e728';

// BaseScan API
// BaseScan V2 (no key required for basic usage)
const url = `https://api.basescan.org/api?chainid=8453&module=account&action=tokentx&address=${POOL}&contractaddress=${VBMS}&sort=desc&apikey=YourApiKeyToken`;

const r = await fetch(url);
const d = await r.json();

if (d.status !== '1') {
  console.log('BaseScan error:', d.message, d.result);
} else {
  const txs = d.result;
  console.log('Total transfers:', txs.length);

  const outflows = txs.filter(tx => tx.from.toLowerCase() === POOL.toLowerCase());
  const inflows = txs.filter(tx => tx.to.toLowerCase() === POOL.toLowerCase());

  console.log('\n=== OUTFLOWS (claims) ===');
  for (const tx of outflows.slice(0, 30)) {
    const amount = Number(tx.value) / 1e18;
    console.log(`  ${tx.to} | ${amount.toFixed(2)} VBMS | block ${tx.blockNumber} | ${new Date(tx.timeStamp * 1000).toISOString()} | ${tx.hash}`);
  }

  console.log('\n=== INFLOWS (refills) ===');
  for (const tx of inflows.slice(0, 10)) {
    const amount = Number(tx.value) / 1e18;
    console.log(`  ${tx.from} | +${amount.toFixed(2)} VBMS | block ${tx.blockNumber}`);
  }

  // Group by recipient
  const byAddr = {};
  for (const tx of outflows) {
    const to = tx.to.toLowerCase();
    if (!byAddr[to]) byAddr[to] = { total: 0, count: 0 };
    byAddr[to].total += Number(tx.value) / 1e18;
    byAddr[to].count++;
  }

  console.log('\n=== BY ADDRESS (sorted by total) ===');
  const sorted = Object.entries(byAddr).sort((a,b) => b[1].total - a[1].total);
  for (const [addr, data] of sorted.slice(0, 20)) {
    console.log(`  ${addr}: ${data.total.toFixed(2)} VBMS in ${data.count} claims`);
  }
}
