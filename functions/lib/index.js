"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOldRooms = exports.updateTwitter = exports.updateStats = exports.recordMatch = exports.createProfile = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin
admin.initializeApp();
const db = admin.database();
// Helper: Verify wallet signature (placeholder - implement if needed)
function verifyWalletOwnership(address, signature) {
    // TODO: Implement signature verification if you want extra security
    // For now, we trust the client (better than nothing)
    return true;
}
// 1. Create Profile
exports.createProfile = functions.https.onCall(async (data, context) => {
    const { address, username } = data;
    if (!address || !username) {
        throw new functions.https.HttpsError('invalid-argument', 'Address and username are required');
    }
    const normalizedUsername = username.toLowerCase();
    try {
        // Check if wallet already has a profile
        const profileSnapshot = await db.ref(`profiles/${address}`).once('value');
        if (profileSnapshot.exists()) {
            throw new functions.https.HttpsError('already-exists', 'This wallet already has a profile');
        }
        // Check if username is taken
        const usernamesSnapshot = await db.ref('usernames').once('value');
        if (usernamesSnapshot.exists()) {
            const usernames = usernamesSnapshot.val();
            if (Object.values(usernames).includes(normalizedUsername)) {
                throw new functions.https.HttpsError('already-exists', 'Username already taken');
            }
        }
        // Create profile
        const profile = {
            address,
            username,
            createdAt: Date.now(),
            lastUpdated: Date.now(),
            stats: {
                totalCards: 0,
                totalPower: 0,
                pveWins: 0,
                pveLosses: 0,
                pvpWins: 0,
                pvpLosses: 0
            }
        };
        // Save profile and username in a transaction
        await db.ref(`profiles/${address}`).set(profile);
        await db.ref(`usernames/${normalizedUsername}`).set(address);
        console.log('✅ Profile created:', address, username);
        return { success: true, profile };
    }
    catch (error) {
        console.error('❌ Error creating profile:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
// 2. Record Match (server-side validation)
exports.recordMatch = functions.https.onCall(async (data, context) => {
    const { playerAddress, type, result, playerPower, opponentPower, playerCards, opponentCards, opponentAddress } = data;
    if (!playerAddress || !type || !result) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }
    try {
        // Get player profile
        const profileSnapshot = await db.ref(`profiles/${playerAddress}`).once('value');
        if (!profileSnapshot.exists()) {
            throw new functions.https.HttpsError('not-found', 'Profile not found');
        }
        const profile = profileSnapshot.val();
        // Create match record
        const matchId = db.ref(`playerMatches/${playerAddress}`).push().key;
        const match = {
            id: matchId,
            playerAddress,
            type,
            result,
            playerPower,
            opponentPower,
            opponentAddress,
            timestamp: Date.now(),
            playerCards,
            opponentCards
        };
        // Save match
        await db.ref(`playerMatches/${playerAddress}/${matchId}`).set(match);
        // Update stats
        const statsUpdate = {};
        if (type === 'pve') {
            if (result === 'win') {
                statsUpdate.pveWins = profile.stats.pveWins + 1;
            }
            else if (result === 'loss') {
                statsUpdate.pveLosses = profile.stats.pveLosses + 1;
            }
        }
        else {
            if (result === 'win') {
                statsUpdate.pvpWins = profile.stats.pvpWins + 1;
            }
            else if (result === 'loss') {
                statsUpdate.pvpLosses = profile.stats.pvpLosses + 1;
            }
        }
        // Update profile stats
        await db.ref(`profiles/${playerAddress}/stats`).update(statsUpdate);
        await db.ref(`profiles/${playerAddress}`).update({ lastUpdated: Date.now() });
        console.log('✅ Match recorded:', playerAddress, type, result);
        return { success: true, matchId };
    }
    catch (error) {
        console.error('❌ Error recording match:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
// 3. Update Stats (NFT cards loaded)
exports.updateStats = functions.https.onCall(async (data, context) => {
    const { address, totalCards, totalPower } = data;
    if (!address) {
        throw new functions.https.HttpsError('invalid-argument', 'Address is required');
    }
    try {
        // Update stats
        await db.ref(`profiles/${address}/stats`).update({
            totalCards,
            totalPower
        });
        await db.ref(`profiles/${address}`).update({
            lastUpdated: Date.now()
        });
        console.log('✅ Stats updated:', address, totalCards, totalPower);
        return { success: true };
    }
    catch (error) {
        console.error('❌ Error updating stats:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
// 4. Update Twitter (OAuth verified)
exports.updateTwitter = functions.https.onCall(async (data, context) => {
    const { address, twitter } = data;
    if (!address || !twitter) {
        throw new functions.https.HttpsError('invalid-argument', 'Address and twitter are required');
    }
    const cleanTwitter = twitter.trim();
    if (!cleanTwitter) {
        throw new functions.https.HttpsError('invalid-argument', 'Twitter handle cannot be empty');
    }
    try {
        await db.ref(`profiles/${address}`).update({
            twitter: cleanTwitter,
            lastUpdated: Date.now()
        });
        console.log('✅ Twitter updated:', address, cleanTwitter);
        return { success: true };
    }
    catch (error) {
        console.error('❌ Error updating Twitter:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
// 5. Cleanup old rooms (scheduled function - runs every 5 minutes)
exports.cleanupOldRooms = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
    console.log('🧹 Starting scheduled cleanup...');
    const now = Date.now();
    const fiveMinutesAgo = now - 300000; // 5 minutes
    const oneMinuteAgo = now - 60000; // 1 minute
    try {
        // Clean old rooms
        const roomsSnapshot = await db.ref('rooms').once('value');
        if (roomsSnapshot.exists()) {
            const rooms = roomsSnapshot.val();
            let roomsDeleted = 0;
            for (const [code, room] of Object.entries(rooms)) {
                const r = room;
                if (r.createdAt < fiveMinutesAgo) {
                    await db.ref(`rooms/${code}`).remove();
                    roomsDeleted++;
                }
            }
            if (roomsDeleted > 0) {
                console.log(`✅ Deleted ${roomsDeleted} old rooms`);
            }
        }
        // Clean old matchmaking entries
        const matchmakingSnapshot = await db.ref('matchmaking').once('value');
        if (matchmakingSnapshot.exists()) {
            const players = matchmakingSnapshot.val();
            let entriesDeleted = 0;
            for (const [addr, data] of Object.entries(players)) {
                const d = data;
                if (d.timestamp < oneMinuteAgo) {
                    await db.ref(`matchmaking/${addr}`).remove();
                    entriesDeleted++;
                }
            }
            if (entriesDeleted > 0) {
                console.log(`✅ Deleted ${entriesDeleted} stale matchmaking entries`);
            }
        }
        console.log('✅ Cleanup completed');
        return null;
    }
    catch (error) {
        console.error('❌ Cleanup error:', error);
        return null;
    }
});
//# sourceMappingURL=index.js.map