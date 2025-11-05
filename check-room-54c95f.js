const { ConvexHttpClient } = require("convex/browser");

// Check both dev and prod
async function checkBoth() {
  const devClient = new ConvexHttpClient("https://canny-dachshund-674.convex.cloud");
  const prodClient = new ConvexHttpClient("https://scintillating-crane-430.convex.cloud");

  console.log("=== Checking room 54C95F ===\n");
  
  try {
    console.log("DEV (canny-dachshund-674):");
    const devRoom = await devClient.query("rooms:getRoom", { code: "54C95F" });
    console.log(devRoom ? JSON.stringify(devRoom, null, 2) : "Not found");
  } catch (e) {
    console.log("Error:", e.message);
  }

  console.log("\n");

  try {
    console.log("PROD (scintillating-crane-430):");
    const prodRoom = await prodClient.query("rooms:getRoom", { code: "54C95F" });
    console.log(prodRoom ? JSON.stringify(prodRoom, null, 2) : "Not found");
  } catch (e) {
    console.log("Error:", e.message);
  }
}

checkBoth();
