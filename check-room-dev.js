const { ConvexHttpClient } = require("convex/browser");

const client = new ConvexHttpClient("https://canny-dachshund-674.convex.cloud");

async function checkRoom() {
  try {
    console.log("Checking room 14fc38 in DEV...");
    const room = await client.query("rooms:getRoom", { code: "14fc38" });
    if (room) {
      console.log("Room found:", JSON.stringify(room, null, 2));
    } else {
      console.log("Room not found - it may have been cleaned up or never created successfully");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

checkRoom();
