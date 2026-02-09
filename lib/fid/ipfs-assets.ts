/**
 * IPFS Asset URLs for VibeFID
 *
 * In production, returns IPFS URLs to reduce Vercel bandwidth.
 * In development, returns local paths.
 */

const USE_IPFS = process.env.NODE_ENV === 'production';

export const IPFS_ASSETS: Record<string, string> = {
  // GIFs and videos
  "/images/share-vibefid.gif": "https://ipfs.filebase.io/ipfs/QmYXLY6s18PZjdGMZALFmgaEHf7qa5DErK7rcSpArvp2Te",
  "/images/vibefid-card-og.gif": "https://ipfs.filebase.io/ipfs/QmWbJ6JveX56Bse2L55PtDq5pkqfR9GLNoa1U41FNTNtwt",
  "/vibemail/suck-jones.mp4": "https://ipfs.filebase.io/ipfs/QmcQ2mSo2gXQgkAjLHFCu6DMLRFjehp2Aes58UWr3xxgaR",

  // Music files (same as vibe-most-wanted)
  "/music/default.mp3": "https://ipfs.filebase.io/ipfs/QmcdrajJ9vUk8kivw35ZVfEvn2nLh3moZQbhsUDHntPYaQ",
  "/music/background.mp3": "https://ipfs.filebase.io/ipfs/QmcdrajJ9vUk8kivw35ZVfEvn2nLh3moZQbhsUDHntPYaQ",
  "/music/en.mp3": "https://ipfs.filebase.io/ipfs/QmQm1faGh4SyjbxspRQbHjUUgG3YgkCvtbcZGXYQLXsNwX",
  "/music/es.mp3": "https://ipfs.filebase.io/ipfs/QmYCFNkUQADqD5QyPEcTjB8TtMSAyyd5EqvHExNP5MczsJ",
  "/music/fr.mp3": "https://ipfs.filebase.io/ipfs/QmS4F3NcapFjAePsjhRnUs8CHLkn2MvFBHHnUviLJx5upS",
  "/music/hi.mp3": "https://ipfs.filebase.io/ipfs/Qmejz5EC2FSqeF9B5RekdoqBAjMqh2bFM6uCKgZMYEAUov",
  "/music/id.mp3": "https://ipfs.filebase.io/ipfs/Qmc22PVtaKrZdgk486Uomi2aFyuhgBEv61etABA4MfmTh3",
  "/music/it.mp3": "https://ipfs.filebase.io/ipfs/QmQP2gj96hkscCcWxDhB1HquTLhFVGWXswMxx7jsnDsceq",
  "/music/ja.mp3": "https://ipfs.filebase.io/ipfs/QmVJV3sXr6Rzh6iNQJdWp7yMfbdiiwGRkT83LCTFgA88Mj",
  "/music/pt-br.mp3": "https://ipfs.filebase.io/ipfs/QmXLiVaVwVXiCKJf59DqdiZKifovrSWS8Y3oq8pYBmYtTu",
  "/music/ru.mp3": "https://ipfs.filebase.io/ipfs/QmVW6v7rFtG5MWoBH6pV45MMEM6kf9bYMm1xV96Gc4hfp1",
  "/music/zh-cn.mp3": "https://ipfs.filebase.io/ipfs/QmY4gW3qyCdnjSCnwqwLXw7D9H2t4DSuPwUov3iYzFixma",
};

export function getAssetUrl(localPath: string): string {
  if (!USE_IPFS) return localPath;
  return IPFS_ASSETS[localPath] || localPath;
}
