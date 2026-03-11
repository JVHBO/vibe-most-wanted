const BASE_CONVEX_URL = 'https://agile-orca-761.convex.cloud/api/query';

const EXPLOIT_ADDRS = [
  '0x03158f615fb0ca3d2d56793d673d7e1c3a799f41',
  '0x43ef6a2ecedb94995a8e8d19026ead00e1fde7f0',
  '0x571e1bf9c2f98849ad459e2271aa689e7f3ff9d2',
  '0x4afeb6dba5e2b4911bd239326c5b7ee58867a7db',
];

async function getTxHistory(address) {
  const r = await fetch(BASE_CONVEX_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      path: 'vbmsClaim:getFullTransactionHistory',
      args: { address: address.toLowerCase(), limit: 100 },
      format: 'json'
    })
  });
  return r.json();
}

for (const addr of EXPLOIT_ADDRS) {
  console.log(`\n\n=== ${addr} ===`);
  const r = await getTxHistory(addr);
  const txs = r?.value?.transactions || [];
  for (const tx of txs) {
    const ts = new Date(tx.timestamp).toISOString();
    console.log(`  [${ts}] ${tx.source} | type=${tx.type} | amount=${tx.amount} | source_fn=${tx.sourceFunction || ''} | desc=${tx.description || ''} | balance=${tx.balanceBefore}->${tx.balanceAfter}`);
  }
}
