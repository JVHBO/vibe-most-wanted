const { ConvexHttpClient } = require("convex/browser");

const CONVEX_URL = "https://canny-dachshund-674.convex.cloud";

async function testConvex() {
  console.log("🧪 Testando conexão Convex...\n");

  try {
    const client = new ConvexHttpClient(CONVEX_URL);

    console.log("✅ Cliente Convex criado com sucesso!");
    console.log(`📡 URL: ${CONVEX_URL}\n`);

    // Testar query de leaderboard (top profiles)
    console.log("🔍 Buscando leaderboard...");
    const profiles = await client.query("profiles:getLeaderboard", { limit: 5 });

    console.log(`✅ Query funcionou! Encontrados ${profiles?.length || 0} perfis\n`);

    if (profiles && profiles.length > 0) {
      console.log("📋 Top 5 perfis:");
      profiles.forEach((p, i) => {
        console.log(`${i + 1}. ${p.username} - ${p.stats?.totalPower || 0} power`);
      });
    } else {
      console.log("⚠️  Nenhum perfil encontrado (banco de dados vazio)");
    }

    console.log("\n✨ Convex está funcionando perfeitamente!");
    return true;

  } catch (error) {
    console.error("❌ Erro ao testar Convex:");
    console.error(error.message);

    if (error.message.includes("not found")) {
      console.log("\n💡 Solução: Execute 'npx convex dev' em um terminal");
    }

    return false;
  }
}

testConvex();
