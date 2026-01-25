// Mapping of imagedelivery.net image IDs to VMW character names
// Used to identify cards that don't have the "name" attribute in metadata
// Generated from vmw-tcg-cards.json tokenIds

export const imageIdToCharacter: Record<string, string> = {
  "cf76a5d7-2499-4d6a-41ca-9b0b99b21400": "rachel",
  "5b35c501-a248-4b6b-74fc-efad891b1300": "claude",
  "91b016b3-1467-4ebf-0d6f-0a69b930be00": "gozaru",
  "48532394-43ef-46fa-49f1-c2ea600f6400": "ink",
  "5bfa5c3a-28b5-4d12-987f-e21888379800": "casa",
  "f8c0e70e-5e59-4085-c3d4-1e8bef9ed500": "groko",
  "e07156c2-0597-4b86-0a44-e10cdde83000": "rizkybegitu",
  "c11c7ef2-d2c3-4af6-09d9-3e8093a88200": "thosmur",
  "972c7568-7f9e-428b-b1a1-28a840847d00": "brainpasta",
  "93261a93-6390-484d-6674-cc9b3d718600": "gaypt",
  "38816510-9da3-4ab4-0427-d3b5a3fb9100": "dan romero",
  "869c891c-0b23-4ff9-6ad0-649159956200": "morlacos",
  "fac5e69c-fc96-4311-eeb4-334cb3b6f800": "landmine",
  "ae1e58b7-46f3-4253-c433-897ed7db4400": "linux",
  "fee62b95-7f9a-4544-97e4-35dfc75dc600": "joonx",
  "811a5f12-e163-40ba-4c7d-08ed8b8bda00": "filthy",
  "24969f85-7659-473d-deac-45f9b6dd5200": "pooster",
  "dd96e2da-e216-4cf5-ebce-e0e3714ed900": "pooster", // Token #6680
  "553fd429-baaa-409e-67c6-b860035bae00": "john porn",
  "ae181450-5b90-4c33-c7c0-b49275b06c00": "scum",
  "a7a49109-1d1a-464f-9b72-0bc2e4ce3f00": "vlad",
  "477ea618-0054-4078-d5dd-81ad38c8cb00": "smolemaru",
  "f0301c93-3419-42e1-3d1c-6c66397d4300": "ventra",
  "5fdef419-576e-48e1-3dc3-dfaa42367400": "bradymck",
  "c0e67dfa-3b4a-4c14-7460-783866f87900": "shill",
  "6b0a1794-9c02-4c3d-8c2a-c7ec6e1c3d00": "beto",
  "c3c7ab97-5162-4eb5-09b1-1231e6910400": "qrcodo",
  "e0c3296c-d905-4238-953f-e8520bc10a00": "loground",
  "b9f70c04-8c0b-414f-6a42-814657ef2a00": "melted",
  "591596a7-5e92-4182-8281-13a2c655f800": "sartocrates",
  "5e5f5b3b-8c53-4146-815f-7404630da700": "lombra",
  "d1b39a24-cf40-4622-7f4a-303b8d3df100": "vibe",
  "775e2364-5a60-4dec-37c8-19cf147be300": "jack",
  "59a1df8b-1262-47fa-f5ec-742d9cd9bd00": "beeper",
  "33bc5a3b-0e08-4980-3acd-24e1eb395a00": "horsefacts",
  "f4a4ef0e-d3af-44bc-4734-c8a1a7b0d100": "jc",
  "1c55bba4-f47b-4d3c-16ee-d0e975a67f00": "zurkchad",
  "5e98e983-bd6b-4d63-b39d-8707e5b7c000": "proxy",
  "2a3f2689-a6b6-4512-5a39-45b736281a00": "brian armstrong",
  "1c25b20a-e889-4ded-5928-41486a6e8e00": "nftkid",
  "88c2a08b-97be-4a4a-6355-ae37bf54c800": "antonio",
  "6acfa1f9-484f-4369-5d2d-3042d1266600": "goofy romero",
  "2fd8dc84-ee43-4a98-2f98-0d3560186f00": "tukka",
  "52f68b3b-44b9-4f74-861c-79ee10e45300": "chilli",
  "ccd5b0a9-494e-4f37-3c67-0bf22c2f6700": "miguel",
  "c151672d-142f-456d-6973-8dd4b0b20e00": "ye",
  "6a90c3a0-3827-4e1d-e812-871f9f6afb00": "nicogay"
};

// Extract image ID from imagedelivery.net URL
export function extractImageId(imageUrl: string | undefined): string | null {
  if (!imageUrl) return null;
  const decoded = decodeURIComponent(imageUrl);
  const match = decoded.match(/imagedelivery\.net\/[^/]+\/([^/]+)/);
  return match ? match[1] : null;
}

// Get character name from image URL
export function getCharacterFromImage(imageUrl: string | undefined): string | null {
  const imageId = extractImageId(imageUrl);
  if (!imageId) return null;
  return imageIdToCharacter[imageId] || null;
}
