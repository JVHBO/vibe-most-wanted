const { ConvexHttpClient } = require("convex/browser");

const client = new ConvexHttpClient("https://scintillating-crane-430.convex.cloud");

async function checkRoom() {
  try {
    console.log("Checking room 14fc38...");
    const room = await client.query("rooms:getRoom", { code: "14fc38" });
    console.log("Room found:", JSON.stringify(room, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Full error:", error);
  }
}

checkRoom();
