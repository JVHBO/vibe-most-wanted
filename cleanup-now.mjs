import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = "https://pleasant-ocelot-859.convex.cloud";

async function cleanupAllRooms() {
  console.log("🔧 Connecting to Convex...");
  const client = new ConvexHttpClient(CONVEX_URL);

  try {
    // Delete all old/expired rooms
    console.log("🗑️ Deleting all old/expired rooms...");
    const result = await client.mutation(
      { _name: "pokerBattle:cleanupOldRooms" },
      {}
    );
    console.log(`✅ Deleted ${result.deletedCount} room(s)`);

    // List remaining rooms
    console.log("\n📋 Listing remaining rooms...");
    const rooms = await client.query(
      { _name: "pokerBattle:listAllRooms" },
      {}
    );

    console.log(`Found ${rooms.length} remaining room(s):`);
    rooms.forEach((room) => {
      console.log(`  - Room ${room.roomId}: ${room.status} (Host: ${room.hostAddress}, Guest: ${room.guestAddress || 'waiting'})`);
    });

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    client.close();
  }
}

cleanupAllRooms();
