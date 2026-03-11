const key = 'Y4XuYCtUIN1ArerfvN83lI2IgS8AJQyh';
const BASE = 'https://base-mainnet.g.alchemy.com/v2/' + key;
const POOL = '0x062b914668f3fd35c3ae02e699cb82e1cf4be18b';

async function fetchPage(pageKey) {
  const params = { fromAddress: POOL, category: ['erc20'], withMetadata: true, order: 'desc', maxCount: '0x64' };
  if (pageKey) params.pageKey = pageKey;
  const r = await fetch(BASE, {
    method: 'POST', headers: {'content-type':'application/json'},
    body: JSON.stringify({jsonrpc:'2.0',id:1,method:'alchemy_getAssetTransfers',params:[params]})
  });
  return r.json();
}

let all = [];
let pageKey = null;
let pages = 0;
do {
  const d = await fetchPage(pageKey);
  const txs = d.result?.transfers || [];
  all = all.concat(txs);
  pageKey = d.result?.pageKey;
  pages++;
  if (pages > 10) break;
} while (pageKey);

console.log('Total claims from pool:', all.length);
console.log('Token contracts seen:', [...new Set(all.map(t=>t.rawContract?.address))]);

// Group by recipient
const byAddr = {};
for (const tx of all) {
  const to = tx.to.toLowerCase();
  if (!byAddr[to]) byAddr[to] = { total: 0, count: 0, txs: [] };
  byAddr[to].total += tx.value || 0;
  byAddr[to].count++;
  byAddr[to].txs.push({
    hash: tx.hash,
    block: parseInt(tx.blockNum, 16),
    amount: tx.value,
    ts: tx.metadata?.blockTimestamp
  });
}

console.log('\nBy address (sorted by total):');
const sorted = Object.entries(byAddr).sort((a,b) => b[1].total - a[1].total);
for (const [addr, data] of sorted) {
  console.log(`\n  ${addr} — ${data.total.toFixed(2)} VBMS in ${data.count} claims`);
  for (const tx of data.txs) {
    console.log(`    block ${tx.block} | ${tx.ts} | ${tx.amount} VBMS | ${tx.hash}`);
  }
}
