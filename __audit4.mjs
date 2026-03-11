const key = 'Y4XuYCtUIN1ArerfvN83lI2IgS8AJQyh';
const BASE = 'https://base-mainnet.g.alchemy.com/v2/' + key;
const POOL = '0x062b914668f3fd35c3ae02e699cb82e1cf4be18b';
const VBMS = '0xF14C1dC8Ce5fE65413379F76c43fA1460C31e728';
const TRANSFER_SIG = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// claimVBMS(uint256 amount, uint256 nonce, bytes signature) selector
const CLAIM_SELECTOR = '0x'; // will decode from txs

async function rpc(method, params) {
  const r = await fetch(BASE, {
    method: 'POST', headers: {'content-type':'application/json'},
    body: JSON.stringify({jsonrpc:'2.0',id:1,method,params})
  });
  return r.json();
}

// Get all Transfer events FROM pool in the last 100k blocks
const latestRes = await rpc('eth_blockNumber', []);
const latest = parseInt(latestRes.result, 16);
const fromBlock = '0x' + (latest - 50000).toString(16); // ~1 day on Base

console.log('Checking blocks from', latest - 50000, 'to', latest, '(last ~24h on Base)');
console.log('Pool:', POOL);

// Get all Transfer events FROM pool (= claimVBMS outflows)
const logsRes = await rpc('eth_getLogs', [{
  fromBlock,
  toBlock: 'latest',
  address: VBMS,
  topics: [
    TRANSFER_SIG,
    '0x000000000000000000000000' + POOL.slice(2),  // from = pool
    null  // to = anyone
  ]
}]);

const logs = logsRes?.result || [];
console.log('\nTotal VBMS transfers FROM pool:', logs.length);

let totalClaimed = 0n;
const byAddr = {};

for (const log of logs) {
  const to = '0x' + log.topics[2].slice(26).toLowerCase();
  const amount = BigInt(log.data);
  const amountVBMS = Number(amount) / 1e18;
  totalClaimed += amount;

  if (!byAddr[to]) byAddr[to] = { total: 0, count: 0, txs: [] };
  byAddr[to].total += amountVBMS;
  byAddr[to].count++;
  byAddr[to].txs.push({ hash: log.transactionHash, block: parseInt(log.blockNumber, 16), amount: amountVBMS });
}

console.log('Total VBMS claimed:', (Number(totalClaimed) / 1e18).toFixed(2));
console.log('\nBy address:');
const sorted = Object.entries(byAddr).sort((a,b) => b[1].total - a[1].total);
for (const [addr, data] of sorted) {
  console.log('\n  ' + addr + ' — ' + data.total.toFixed(2) + ' VBMS in ' + data.count + ' claims');
  for (const tx of data.txs) {
    console.log('    block ' + tx.block + ': ' + tx.amount.toFixed(2) + ' VBMS | tx: ' + tx.hash);
  }
}

// Also check: did pool receive VBMS recently (refills)?
const refillRes = await rpc('eth_getLogs', [{
  fromBlock,
  toBlock: 'latest',
  address: VBMS,
  topics: [
    TRANSFER_SIG,
    null,
    '0x000000000000000000000000' + POOL.slice(2),  // to = pool
  ]
}]);
const refills = refillRes?.result || [];
console.log('\n--- Pool refills (last 24h):', refills.length);
for (const l of refills) {
  const from = '0x' + l.topics[1].slice(26);
  const amt = Number(BigInt(l.data)) / 1e18;
  console.log('  +' + amt.toFixed(2) + ' from ' + from + ' block ' + parseInt(l.blockNumber,16));
}
