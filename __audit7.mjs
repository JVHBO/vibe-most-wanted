// Check addressLinks for the exploit addresses
const BASE_CONVEX_URL = 'https://agile-orca-761.convex.cloud/api/query';

const EXPLOIT_ADDRS = [
  '0x03158f615fb0ca3d2d56793d673d7e1c3a799f41',
  '0x43ef6a2ecedb94995a8e8d19026ead00e1fde7f0',
  '0x571e1bf9c2f98849ad459e2271aa689e7f3ff9d2',
  '0x4afeb6dba5e2b4911bd239326c5b7ee58867a7db',
];

// Also check recent large claimers for reference
const OTHER_ADDRS = [
  '0x247116c752420ec7fe870d1549a1c2e8d44675c6',  // 1.4M VBMS
  '0x8215db2678e8482dd6051b6847e148ce058ec3b6',  // 750k VBMS
];

async function getProfile(address) {
  const r = await fetch(BASE_CONVEX_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      path: 'profiles:getProfile',
      args: { address: address.toLowerCase() },
      format: 'json'
    })
  });
  return r.json();
}

async function checkAuditLog(address) {
  const r = await fetch(BASE_CONVEX_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      path: 'vbmsClaim:getFullTransactionHistory',
      args: { address: address.toLowerCase(), limit: 10 },
      format: 'json'
    })
  });
  return r.json();
}

console.log('=== EXPLOIT ADDRESS CHECK ===\n');

for (const addr of EXPLOIT_ADDRS) {
  const profile = await getProfile(addr);
  const history = await checkAuditLog(addr);
  console.log(`\n${addr}`);
  console.log('  Profile:', profile?.value ? `coins=${profile.value.coins}, inbox=${profile.value.coinsInbox}, fid=${profile.value.farcasterFid || profile.value.fid}` : 'NULL');
  console.log('  TxHistory:', history?.value?.total || 0, 'entries');
}

console.log('\n=== LARGE CLAIMER PROFILES ===');
for (const addr of OTHER_ADDRS) {
  const profile = await getProfile(addr);
  console.log(`\n${addr}`);
  console.log('  Profile:', profile?.value ? `coins=${profile.value.coins}, inbox=${profile.value.coinsInbox}, fid=${profile.value.farcasterFid || profile.value.fid}, lifetime=${profile.value.lifetimeEarned}` : 'NULL');
}
