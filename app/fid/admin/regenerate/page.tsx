"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/lib/fid/convex-generated/api";
import { generateFarcasterCardImage } from "@/lib/fid/generateFarcasterCard";
import { generateCardVideo } from "@/lib/fid/generateCardVideo";

// Admin password - change this to something secure
const ADMIN_PASSWORD = "vf2026admin";

// Known broken FIDs with placeholder URLs (379 total)
const BROKEN_FIDS = [1471,1581,1699,2802,4926,7468,8152,8637,8942,11241,11535,11782,12254,13182,13837,13939,14253,14363,14505,14572,15207,16956,17296,17940,18561,19095,20768,21024,23105,187800,187817,190096,191253,192053,192500,192718,195478,196149,196171,196526,199347,199866,201117,203209,204214,204287,204385,204731,205937,208744,211186,212556,213559,217630,217720,218530,228792,232366,232855,234568,234764,235724,235813,235940,236012,236093,237614,239695,242410,242566,245042,245497,247081,247437,248111,248222,249647,249724,249963,250003,250214,251849,253214,253287,253954,257704,259404,261119,261847,262253,263574,265120,265426,268455,268567,269091,269385,271946,272751,273503,274034,275646,277059,279347,281140,282725,284116,286418,288425,291855,293991,294100,294767,295812,296422,299675,299998,301096,301863,309310,309961,310953,311926,312633,313192,314103,314328,318181,318978,319625,320618,320947,321798,326992,327202,330657,332195,332658,334385,334811,335469,336007,336733,337551,337876,341129,344069,344627,345669,346906,350029,351426,356241,357355,358884,359298,363992,366017,368056,368483,368514,372581,373591,373972,376599,377249,380504,383296,389212,389977,393719,396276,397950,402726,404134,404330,404873,406233,406701,409611,412569,414258,415716,417832,419069,420915,423036,428431,429050,431880,434280,435085,437668,438877,439768,439983,443830,447723,449044,449874,451788,452507,454826,455965,458767,459348,459422,461582,472405,472963,473366,474179,475475,480009,482203,483365,484444,486180,487296,488306,493501,498400,499575,503367,504115,504283,505425,507505,508591,508604,511674,514448,516505,516949,521180,522757,525715,527771,535057,540371,547472,549522,558207,561520,576235,600911,607154,621221,634822,653074,673577,677840,683866,689329,692211,694225,704756,712542,724351,732989,733835,755466,784230,808337,812231,818619,824976,828091,844615,864954,874211,878064,878931,880558,881906,885645,885868,887819,890554,895728,897052,899355,899360,914793,914987,916025,918783,931986,933481,946431,948843,960890,961715,963422,973505,975990,1005571,1009822,1020885,1020952,1025388,1042581,1045823,1047423,1050236,1050560,1051326,1052964,1059075,1067156,1067364,1067642,1067873,1072164,1075728,1088004,1099478,1100204,1100735,1102810,1107123,1107262,1109570,1111249,1115003,1115947,1119912,1120806,1136823,1148848,1153754,1192389,1246672,1278092,1278135,1303187,1316721,1340692,1354478,1356870,1357454,1359750,1364277,1371361,1384082,1395983,1397383,1398248,1399843,1403905,1405471,1406370,1407081,1410950,1412386,1413852,1417406,1418979,1419696,1440432,1440592,1444598,1445475,1450147,1450557,1456371,1472511,1475009,1479995,1482301,1494748,1495736,1499268,1533286,1546333,1552228,1558050,1585127,1990730];

export default function AdminRegenerate() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [processing, setProcessing] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, string>>({});
  const [customFid, setCustomFid] = useState("");
  const [customFids, setCustomFids] = useState<number[]>([]);
  const [bulkInput, setBulkInput] = useState("");
  const [completedCount, setCompletedCount] = useState(0);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Senha incorreta");
    }
  };

  const updateCardImages = useMutation(api.farcasterCards.updateCardImages);
  const refreshCardScore = useMutation(api.farcasterCards.refreshCardScore);

  const regenerateCard = async (fid: number) => {
    setProcessing(fid);
    setResults(prev => ({ ...prev, [fid]: "Buscando dados..." }));

    try {
      // 1. Fetch card data from Convex
      const cardRes = await fetch(`/api/fid/card-data?fid=${fid}`);
      if (!cardRes.ok) {
        const err = await cardRes.json();
        throw new Error(err.error || "Card not found");
      }
      const card = await cardRes.json();

      // 2. Fetch current Neynar score
      setResults(prev => ({ ...prev, [fid]: "Buscando score Neynar..." }));
      const neynarRes = await fetch(`/api/fid/neynar-score?fid=${fid}`);
      if (!neynarRes.ok) throw new Error("Failed to fetch Neynar score");
      const neynarData = await neynarRes.json();
      const currentScore = neynarData.score;

      // 3. Update score in database
      setResults(prev => ({ ...prev, [fid]: `Score: ${card.neynarScore} → ${currentScore}` }));
      await refreshCardScore({
        fid,
        newNeynarScore: currentScore,
      });

      // 4. Generate new card image
      setResults(prev => ({ ...prev, [fid]: "Gerando imagem..." }));
      const bounty = card.power * 10;
      const cardImageDataUrl = await generateFarcasterCardImage({
        pfpUrl: card.pfpUrl,
        displayName: card.displayName,
        username: card.username,
        fid: card.fid,
        neynarScore: currentScore,
        rarity: card.rarity,
        suit: card.suit,
        rank: card.rank,
        suitSymbol: card.suitSymbol,
        color: card.color,
        bio: card.bio || "",
        bounty,
      });

      // 5. Generate video
      setResults(prev => ({ ...prev, [fid]: "Gerando vídeo..." }));
      const videoBlob = await generateCardVideo({
        cardImageDataUrl,
        foilType: card.foil || "None",
        duration: 3,
        fps: 30,
        pfpUrl: card.pfpUrl,
      });

      // 6. Upload video to IPFS
      setResults(prev => ({ ...prev, [fid]: "Upload vídeo..." }));
      const videoFormData = new FormData();
      videoFormData.append("video", videoBlob, "card.webm");
      const videoUploadRes = await fetch("/api/fid/upload-nft-video", {
        method: "POST",
        body: videoFormData,
      });
      if (!videoUploadRes.ok) throw new Error("Failed to upload video");
      const videoResult = await videoUploadRes.json();

      // 7. Upload PNG to IPFS
      setResults(prev => ({ ...prev, [fid]: "Upload PNG..." }));
      const pngBlob = await (await fetch(cardImageDataUrl)).blob();
      const pngFormData = new FormData();
      pngFormData.append("image", pngBlob, "card.png");
      const pngUploadRes = await fetch("/api/fid/upload-nft-image", {
        method: "POST",
        body: pngFormData,
      });
      let cardImageUrl: string | undefined;
      if (pngUploadRes.ok) {
        const pngResult = await pngUploadRes.json();
        cardImageUrl = pngResult.ipfsUrl;
      }

      // 8. Update database
      setResults(prev => ({ ...prev, [fid]: "Salvando..." }));
      await updateCardImages({
        fid,
        imageUrl: videoResult.ipfsUrl,
        cardImageUrl,
      });

      // 9. Refresh OpenSea
      try {
        await fetch("/api/fid/opensea/refresh-metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fid }),
        });
      } catch (e) {}

      setResults(prev => ({ ...prev, [fid]: `✅ OK! Score: ${currentScore} | ${card.username}` }));
      setCompletedCount(prev => prev + 1);
    } catch (err: any) {
      setResults(prev => ({ ...prev, [fid]: `❌ ${err.message}` }));
    }

    setProcessing(null);
  };

  const addCustomFid = () => {
    const fid = parseInt(customFid);
    if (fid && !customFids.includes(fid)) {
      setCustomFids(prev => [...prev, fid]);
      setCustomFid("");
    }
  };

  const addBulkFids = () => {
    const fids = bulkInput
      .split(/[\s,]+/)
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n > 0 && !customFids.includes(n));
    setCustomFids(prev => [...prev, ...fids]);
    setBulkInput("");
  };

  const loadBrokenFids = () => {
    const newFids = BROKEN_FIDS.filter(f => !customFids.includes(f));
    setCustomFids(prev => [...prev, ...newFids]);
  };

  const removeFid = (fid: number) => {
    setCustomFids(prev => prev.filter(f => f !== fid));
    setResults(prev => {
      const newResults = { ...prev };
      delete newResults[fid];
      return newResults;
    });
  };

  const clearAll = () => {
    setCustomFids([]);
    setResults({});
    setCompletedCount(0);
  };

  const regenerateAll = async () => {
    setCompletedCount(0);
    for (const fid of customFids) {
      await regenerateCard(fid);
      await new Promise(r => setTimeout(r, 500));
    }
  };

  const pendingFids = customFids.filter(fid => !results[fid]?.startsWith("✅") && !results[fid]?.startsWith("❌"));
  const completedFids = customFids.filter(fid => results[fid]?.startsWith("✅"));
  const errorFids = customFids.filter(fid => results[fid]?.startsWith("❌"));

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded-lg w-80">
          <h1 className="text-xl font-bold mb-4 text-center">Admin Login</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white mb-4"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          {authError && <p className="text-red-500 text-sm mb-4">{authError}</p>}
          <button
            onClick={handleLogin}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-2">Admin - Regenerar Cards VibeFID</h1>
      <p className="text-gray-400 mb-6 text-sm">Atualiza score, imagem e vídeo do card</p>

      {/* Stats */}
      {customFids.length > 0 && (
        <div className="mb-6 p-4 bg-gray-900 rounded-lg">
          <div className="flex gap-6 text-sm">
            <span>Total: <strong>{customFids.length}</strong></span>
            <span className="text-green-400">Completo: <strong>{completedFids.length}</strong></span>
            <span className="text-red-400">Erro: <strong>{errorFids.length}</strong></span>
            <span className="text-yellow-400">Pendente: <strong>{pendingFids.length}</strong></span>
          </div>
        </div>
      )}

      {/* Input para adicionar FID */}
      <div className="flex gap-2 mb-4">
        <input
          type="number"
          value={customFid}
          onChange={(e) => setCustomFid(e.target.value)}
          placeholder="Digite o FID"
          className="flex-1 max-w-xs px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
          onKeyDown={(e) => e.key === "Enter" && addCustomFid()}
        />
        <button
          onClick={addCustomFid}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-bold"
        >
          + Adicionar
        </button>
      </div>

      {/* Bulk input */}
      <div className="mb-4">
        <textarea
          value={bulkInput}
          onChange={(e) => setBulkInput(e.target.value)}
          placeholder="Cole múltiplos FIDs separados por vírgula ou espaço..."
          className="w-full max-w-xl px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white h-20"
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={addBulkFids}
            disabled={!bulkInput.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold disabled:opacity-50"
          >
            Adicionar Bulk
          </button>
          <button
            onClick={loadBrokenFids}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-bold"
          >
            Carregar {BROKEN_FIDS.length} Quebrados
          </button>
          {customFids.length > 0 && (
            <button
              onClick={clearAll}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
            >
              Limpar Tudo
            </button>
          )}
        </div>
      </div>

      {/* Botão regenerar todos */}
      {customFids.length > 0 && (
        <button
          onClick={regenerateAll}
          disabled={processing !== null}
          className="mb-6 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg disabled:opacity-50"
        >
          {processing !== null ? `Processando... (${completedFids.length}/${customFids.length})` : `Regenerar TODOS (${customFids.length})`}
        </button>
      )}

      {/* Lista de FIDs */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {customFids.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Adicione FIDs acima para regenerar
          </p>
        ) : (
          customFids.map(fid => (
            <div key={fid} className={`flex items-center gap-4 p-3 rounded ${
              results[fid]?.startsWith("✅") ? "bg-green-900/30" :
              results[fid]?.startsWith("❌") ? "bg-red-900/30" :
              processing === fid ? "bg-yellow-900/30" : "bg-gray-900"
            }`}>
              <span className="w-24 font-mono">FID {fid}</span>
              <span className="flex-1 text-sm text-gray-400 truncate">
                {results[fid] || "Aguardando..."}
              </span>
              <button
                onClick={() => regenerateCard(fid)}
                disabled={processing !== null}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm disabled:opacity-50"
              >
                {processing === fid ? "..." : "Regen"}
              </button>
              <button
                onClick={() => removeFid(fid)}
                disabled={processing !== null}
                className="px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-sm disabled:opacity-50"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
