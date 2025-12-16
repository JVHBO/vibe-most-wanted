#!/bin/bash

# Make backup
cp components/FeaturedCastAuctions.tsx components/FeaturedCastAuctions.tsx.bak

# Use node for complex replacement
node -e "
const fs = require('fs');
let content = fs.readFileSync('components/FeaturedCastAuctions.tsx', 'utf8');

// 1. Replace the verify function
const oldVerify = \`      // Call API to verify TX and record bid
      const verifyAndRecordBid = async () => {
        try {
          const response = await fetch(\"/api/cast-auction/place-bid\", {
            method: \"POST\",
            headers: { \"Content-Type\": \"application/json\" },
            body: JSON.stringify({
              txHash: pendingTxHash,
              address,
              slotNumber: pendingBidData.slotNumber,
              bidAmount: pendingBidData.amount,
              castHash: pendingBidData.castHash,
              warpcastUrl: pendingBidData.warpcastUrl,
              castAuthorFid: pendingBidData.castAuthorFid,
              castAuthorUsername: pendingBidData.castAuthorUsername,
              castAuthorPfp: pendingBidData.castAuthorPfp,
              castText: pendingBidData.castText,
            }),
          });

          const result = await response.json();

          if (result.success) {
            setSuccess(\\\`Bid placed! \\\${pendingBidData.amount.toLocaleString()} VBMS\\\`);\`;

const newVerify = \`      // Call API to verify TX and record bid (or add to pool)
      const verifyAndRecordBid = async () => {
        try {
          // Choose endpoint based on whether this is a pool contribution
          const endpoint = pendingBidData.isPoolContribution
            ? \"/api/cast-auction/add-to-pool\"
            : \"/api/cast-auction/place-bid\";

          const bodyData = pendingBidData.isPoolContribution
            ? {
                txHash: pendingTxHash,
                address,
                auctionId: pendingBidData.auctionId,
                bidAmount: pendingBidData.amount,
              }
            : {
                txHash: pendingTxHash,
                address,
                slotNumber: pendingBidData.slotNumber,
                bidAmount: pendingBidData.amount,
                castHash: pendingBidData.castHash,
                warpcastUrl: pendingBidData.warpcastUrl,
                castAuthorFid: pendingBidData.castAuthorFid,
                castAuthorUsername: pendingBidData.castAuthorUsername,
                castAuthorPfp: pendingBidData.castAuthorPfp,
                castText: pendingBidData.castText,
              };

          const response = await fetch(endpoint, {
            method: \"POST\",
            headers: { \"Content-Type\": \"application/json\" },
            body: JSON.stringify(bodyData),
          });

          const result = await response.json();

          if (result.success) {
            const successMsg = pendingBidData.isPoolContribution
              ? \\\`Added \\\${pendingBidData.amount.toLocaleString()} VBMS to pool!\\\`
              : \\\`Bid placed! \\\${pendingBidData.amount.toLocaleString()} VBMS\\\`;
            setSuccess(successMsg);\`;

if (content.includes(oldVerify)) {
  content = content.replace(oldVerify, newVerify);
  console.log('✅ Updated verifyAndRecordBid');
} else {
  console.log('❌ verifyAndRecordBid pattern not found');
}

// 2. Update setPendingBidData to include pool info
const oldSetPending = \`      // Store bid data for when TX confirms
      setPendingBidData({
        amount,
        slotNumber: currentAuction.slotNumber,
        castHash: castPreview.hash,
        warpcastUrl: castUrl,
        castAuthorFid: castPreview.author.fid,
        castAuthorUsername: castPreview.author.username,
        castAuthorPfp: castPreview.author.pfpUrl,
        castText: castPreview.text,
      });\`;

const newSetPending = \`      // Store bid data for when TX confirms
      setPendingBidData({
        amount,
        slotNumber: existingCastInfo?.slotNumber || currentAuction.slotNumber,
        castHash: castPreview.hash,
        warpcastUrl: castUrl,
        castAuthorFid: castPreview.author.fid,
        castAuthorUsername: castPreview.author.username,
        castAuthorPfp: castPreview.author.pfpUrl,
        castText: castPreview.text,
        isPoolContribution: !!existingCastInfo,
        auctionId: existingCastInfo?.auctionId,
      });\`;

if (content.includes(oldSetPending)) {
  content = content.replace(oldSetPending, newSetPending);
  console.log('✅ Updated setPendingBidData');
} else {
  console.log('❌ setPendingBidData pattern not found');
}

// 3. Add setExistingCastInfo(null) to cleanup
const oldCleanup = \`            setBidAmount(\"\");
            setCastUrl(\"\");
            setCastPreview(null);
            setIsExpanded(false);\`;

const newCleanup = \`            setBidAmount(\"\");
            setCastUrl(\"\");
            setCastPreview(null);
            setExistingCastInfo(null);
            setIsExpanded(false);\`;

if (content.includes(oldCleanup) && !content.includes('setExistingCastInfo(null)')) {
  content = content.replace(oldCleanup, newCleanup);
  console.log('✅ Added setExistingCastInfo cleanup');
} else {
  console.log('⚠️ setExistingCastInfo cleanup already exists or pattern not found');
}

// 4. Adjust minimum for pool contributions
const oldMin = \`    const amount = parseInt(bidAmount);
    const minimum = getMinimumBid();

    if (isNaN(amount) || amount < minimum) {
      setError(\\\`Minimum bid is \\\${minimum.toLocaleString()} VBMS\\\`);\`;

const newMin = \`    const amount = parseInt(bidAmount);
    // Pool contributions have lower minimum (1000 VBMS)
    const minimum = existingCastInfo ? 1000 : getMinimumBid();

    if (isNaN(amount) || amount < minimum) {
      setError(\\\`Minimum \\\${existingCastInfo ? 'contribution' : 'bid'} is \\\${minimum.toLocaleString()} VBMS\\\`);\`;

if (content.includes(oldMin)) {
  content = content.replace(oldMin, newMin);
  console.log('✅ Adjusted minimum for pool contributions');
} else {
  console.log('❌ Minimum pattern not found');
}

fs.writeFileSync('components/FeaturedCastAuctions.tsx', content);
console.log('\\n✨ Done!');
"
