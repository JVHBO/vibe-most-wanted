/**
 * BLACKLIST - Exploiter Addresses
 *
 * EXPLOIT #1: Race condition in TESTVBMS->VBMS conversion (Dec 10-12, 2025)
 * Total stolen: 12,505,507 VBMS (~12.5M)
 *
 * EXPLOIT #2: Referral farming with fake accounts (Dec 21, 2025)
 * Total stolen: 38,480,000 VBMS (~38.5M)
 *
 * GRAND TOTAL: ~51M VBMS stolen
 *
 * Last updated: 2025-12-21T23:00:00Z - 106 exploiters
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { logTransaction } from "./coinsInbox";

// ========== HARDCODED BLACKLIST ==========
// These addresses are PERMANENTLY banned from VBMS claims

export const EXPLOITER_BLACKLIST: Record<string, { username: string; fid: number; amountStolen: number; claims: number }> = {
  // ===== EXPLOIT #1: Race Condition (Dec 10-12, 2025) =====
  "0x0395df57f73ae2029fc27a152cd87070bcfbd4a4": { username: "faqih", fid: 1063904, amountStolen: 1283500, claims: 156 },
  "0xbb367d00000f5e37ac702aab769725c299be2fc3": { username: "aliselalujp", fid: 272115, amountStolen: 1096804, claims: 128 },
  "0x0e14598940443b91d097b5fd6a89b5808fe35a6b": { username: "fvgf", fid: 1328239, amountStolen: 1094400, claims: 132 },
  "0x0230cf1cf5bf2537eb385772ff72edd5db45320d": { username: "ndmcm", fid: 1129881, amountStolen: 1094400, claims: 132 },
  "0x9ab292251cfb32b8f405ae43a9851aba61696ded": { username: "ral", fid: 1276961, amountStolen: 1094400, claims: 132 },
  "0xd4c3afc6adce7622400759d5194e5497b162e39d": { username: "fransiska", fid: 1156056, amountStolen: 1090100, claims: 124 },
  "0xa43ae3956ecb0ce00c69576153a34db42d265cc6": { username: "jessica", fid: 520832, amountStolen: 993303, claims: 114 },
  "0x04c6d801f529b8d4f118edb2722d5986d25a6ebf": { username: "khajoel", fid: 528311, amountStolen: 991800, claims: 114 },
  "0xff793f745cb0f1131f0614bf54f4c4310f33f0ce": { username: "azwar", fid: 544479, amountStolen: 991800, claims: 114 },
  "0x4ab24dac98c86778e2c837e5fa37ec5a2fdbffc0": { username: "uenxnx", fid: 1322032, amountStolen: 803900, claims: 97 },
  "0xf73e59d03d45a227e5a37aace702599c15d7e64d": { username: "rapoer", fid: 1168341, amountStolen: 455900, claims: 47 },
  "0xc85a10e41fdea999556f8779ea83e6cd1c5d0ded": { username: "desri", fid: 518884, amountStolen: 303400, claims: 37 },
  "0x0f6cfb4f54fec1deca1f43f9c0294ff945b16eb9": { username: "venombaseeth", fid: 308907, amountStolen: 270700, claims: 34 },
  "0x8cc9746c2bb68bd8f51e30ad96f67596b25b141b": { username: "hdhxhx", fid: 1483990, amountStolen: 98400, claims: 12 },
  "0xdeb2f2f02d2d5a2be558868ca8f31440c73d3091": { username: "jxjsjsjxj", fid: 1439850, amountStolen: 98400, claims: 12 },
  "0x2cb84569b69265eea55a8ceb361549548ca99749": { username: "aaggwgxgch", fid: 1420345, amountStolen: 98400, claims: 12 },
  "0xcd890b0f59d7d1a98ffdf133d6b99458324e6621": { username: "nxnckck", fid: 1328839, amountStolen: 98400, claims: 12 },
  "0xcda1b44a39cd827156334c69552d8ecdc697646f": { username: "hshdjxjck", fid: 1328834, amountStolen: 98400, claims: 12 },
  "0x32c3446427e4481096dd96e6573aaf1fbbb9cff8": { username: "jsjxjxjd", fid: 1328624, amountStolen: 98400, claims: 12 },
  "0xce1899674ac0b4137a5bb819e3849794a768eaf0": { username: "9", fid: 1249352, amountStolen: 98400, claims: 12 },
  "0x0d2450ada31e8dfd414e744bc3d250280dca202e": { username: "komeng", fid: 1031800, amountStolen: 95700, claims: 11 },
  "0x1915a871dea94e538a3c9ec671574ffdee6e7c45": { username: "miya", fid: 252536, amountStolen: 95700, claims: 11 },
  "0x705d7d414c6d94a8d1a06aeffc7cd92882480bd9": { username: "wow", fid: 443434, amountStolen: 60900, claims: 7 },
  // ===== EXPLOIT #2: Referral Farming (Dec 21, 2025) - 86 addresses =====
  "0x93ab9ef9c10bdd9db53e8ec325a42118e0ac1486": { username: "dobronx", fid: 0, amountStolen: 4115000, claims: 100 },
  "0x94e7f886caf987a0029e37ac820982c80a13c148": { username: "pakhaji", fid: 0, amountStolen: 4115000, claims: 100 },
  "0x42a6b996b0547d2d3743b79dde377d98818abd32": { username: "yolo", fid: 0, amountStolen: 1490000, claims: 59 },
  "0x844a8e4da76bd08761f36bdba1f9746d58f9480d": { username: "gm", fid: 0, amountStolen: 1202500, claims: 52 },
  "0x1a2495bf4ed2aaf46e4834ea21d66109fa243f33": { username: "dbd", fid: 0, amountStolen: 1152500, claims: 50 },
  "0x4a2ba466a447d6a2010f4acfa7625db3c3c7cfc9": { username: "tyrionn", fid: 0, amountStolen: 925000, claims: 46 },
  "0x986686aced770960fe8a55d37545ebd90102ca97": { username: "berly", fid: 0, amountStolen: 832500, claims: 43 },
  "0x8f1af8261edae03a3680d1359228d2dac34eaec5": { username: "anonnux", fid: 0, amountStolen: 790000, claims: 52 },
  "0xb4909a4c636c45943c72921542ece5cd5d228cdb": { username: "nody69", fid: 0, amountStolen: 750000, claims: 40 },
  "0x8c84464ac8a4110285cf83d76b0c91d50ecf5fd9": { username: "ycbibvcyrvyb", fid: 0, amountStolen: 750000, claims: 45 },
  "0xe95dd130f8a1ac6e6c6fd8ac0dd9d14a80b3bc4c": { username: "jamie", fid: 0, amountStolen: 750000, claims: 40 },
  "0x4d1ef290857226044b0a9c6916ef4b624967bb12": { username: "gyfjiybyb", fid: 0, amountStolen: 675000, claims: 38 },
  "0xc48e66a008cc7195c048d8b3a95bc48f96c26fd2": { username: "basreng", fid: 0, amountStolen: 675000, claims: 38 },
  "0x8dcfeaba1109ab99d11069c33c8e20bfd64a3ced": { username: "ofkdbd", fid: 0, amountStolen: 632500, claims: 37 },
  "0xbcfbc3e9d1eac6684bc92d9ab6d117bf1c83675f": { username: "xenna", fid: 0, amountStolen: 632500, claims: 37 },
  "0xf494e397fd54efea84f39b51df06811b1657c373": { username: "raees18", fid: 0, amountStolen: 632500, claims: 37 },
  "0x03bf270d1c8429a0b378410c0ca9a07ca258cf79": { username: "rendy", fid: 0, amountStolen: 592500, claims: 35 },
  "0x2e4078e117fc3cf837042f063c522d6521f8baa3": { username: "tayyeba", fid: 0, amountStolen: 592500, claims: 35 },
  "0x9a50ff911c2500b494995e4419be65df3214d1d4": { username: "basdabonezzz", fid: 0, amountStolen: 592500, claims: 35 },
  "0x72fe79e122f447a3ba3d600d33cb74e5e01f2649": { username: "tkjfjf", fid: 0, amountStolen: 555000, claims: 34 },
  "0x92deaf8a0d953cdd64df5232939ab04ab5699604": { username: "bdbs", fid: 0, amountStolen: 555000, claims: 34 },
  "0xa24f8ca04e013911c4af840822119836f1624050": { username: "boli", fid: 0, amountStolen: 555000, claims: 34 },
  "0x5dfc840a696e207ea58f8c87be8fa808aaab366d": { username: "raa", fid: 0, amountStolen: 555000, claims: 34 },
  "0x6e3b59af52ce6f21fdb29ca2f730331f13a1952a": { username: "foom", fid: 0, amountStolen: 555000, claims: 34 },
  "0x4c7c8691b50dd0f070c25165b6ae839c8bcf3ee9": { username: "xennaberryl", fid: 0, amountStolen: 555000, claims: 34 },
  "0x2b0e2df099eee131becf3f4549a87944227c64e9": { username: "bdbsvdvs", fid: 0, amountStolen: 555000, claims: 37 },
  "0x79189269b91c91d3db41d33e3c266f4b704230b0": { username: "tsaqieff", fid: 0, amountStolen: 555000, claims: 34 },
  "0x5678fb8b977d85a499b3d979fad7f38282d1441d": { username: "irurh", fid: 0, amountStolen: 555000, claims: 34 },
  "0xfc84fc61ef5cc8677118a56f9c1b155fe3db97ea": { username: "ltot", fid: 0, amountStolen: 555000, claims: 34 },
  "0x27471fb793704bfa67e00e357258c40880b2d9d5": { username: "bsbsbsur", fid: 0, amountStolen: 555000, claims: 34 },
  "0xf5fa00bc2ad069b8d1e06770ee640b3f53b73e4d": { username: "oyykbt", fid: 0, amountStolen: 555000, claims: 34 },
  "0xc16f0b36e296d4fa710a1cde7a7cc73033b45875": { username: "vavsvs", fid: 0, amountStolen: 555000, claims: 34 },
  "0xe98d89c1c63ca79f75260fb48003aad4a63ff303": { username: "bsbshs", fid: 0, amountStolen: 555000, claims: 34 },
  "0x7ebc13e06ad0e52ec74c58aa2cc8eebf43e1cd23": { username: "pyynf", fid: 0, amountStolen: 555000, claims: 38 },
  "0x3b2848c24046708b86bea8f86a69fbd942ebcf3e": { username: "tare", fid: 0, amountStolen: 520000, claims: 33 },
  "0x7de544a076e163a8050d4b7cd0d67464836b54e9": { username: "haji", fid: 0, amountStolen: 520000, claims: 33 },
  "0xbb3d7721ab44d5a2e4d509d0223d77581d18911b": { username: "kulay", fid: 0, amountStolen: 520000, claims: 33 },
  "0xcbf6e8efc0720c7fd99bce14b7fa5578af75a870": { username: "soft", fid: 0, amountStolen: 520000, claims: 33 },
  "0x9a9eaa9c7569ac36087b9685c989aeb5ae89ea8a": { username: "uma", fid: 0, amountStolen: 520000, claims: 32 },
  "0x588dcd65f44572f3e5ce323b4570e30025da755a": { username: "omaga", fid: 0, amountStolen: 520000, claims: 32 },
  "0x987d2f1cf8ea90a75ad11851ad356380124eda4c": { username: "berryl", fid: 0, amountStolen: 520000, claims: 34 },
  "0x9d56d4e3ff49ccca7e0f9590c64ffd262e8c83c0": { username: "bebehd", fid: 0, amountStolen: 520000, claims: 35 },
  "0x8dd19c3f844095ca321a10f6d95d621f6bd26ba3": { username: "haha", fid: 0, amountStolen: 520000, claims: 32 },
  "0xe9cf12695d5613143f5c90f98dec50299648cf91": { username: "gilame", fid: 0, amountStolen: 520000, claims: 33 },
  "0xd68b474126ab6042391db26cdf86e6a4da12ce36": { username: "bsbs", fid: 0, amountStolen: 520000, claims: 32 },
  "0x826acbaf69cb9878fb1188e07558908285f556ae": { username: "bankrbot", fid: 0, amountStolen: 520000, claims: 32 },
  "0x6216b24345b8ad3b8fbcaf5c37262b07781a29ef": { username: "khaleed", fid: 0, amountStolen: 520000, claims: 33 },
  "0x17b0e93e326f5221fad0b9f8f873a40303a3565a": { username: "jonsnow", fid: 0, amountStolen: 520000, claims: 32 },
  "0x067a3c235b8c7f2127c5ea504ab253ac7bd3ab18": { username: "kim", fid: 0, amountStolen: 520000, claims: 32 },
  "0x5c51fb6fb7dbd99aa0c3ff05b6b33cd1fcd0e1c0": { username: "haruto", fid: 0, amountStolen: 457500, claims: 30 },
  "0x40bc7906e5dd887d0df7a04c125b8ee99ffb999b": { username: "renz420", fid: 0, amountStolen: 422500, claims: 29 },
  "0x34d1163f8f3d44c38bacbb6a8c86acb62cd7e4fb": { username: "mexxeth", fid: 0, amountStolen: 390000, claims: 42 },
  "0xc1fc1b3c4818ba8d93b1ecfe3363c967d44efe6c": { username: "ombray", fid: 0, amountStolen: 322500, claims: 23 },
  "0x0d8c3bdc2ed9e10668ec802cd704e724376158fc": { username: "gunvir", fid: 0, amountStolen: 322500, claims: 25 },
  "0xb5387885faa8194b59837549b67ad6fe97697dcb": { username: "qowhec", fid: 0, amountStolen: 322500, claims: 34 },
  "0xbde56569fbdce28d41291b46ca4f028e38f99253": { username: "pythvsvs", fid: 0, amountStolen: 270000, claims: 34 },
  "0xa813827e94fe2b454eda32659c80bf36d6b0ae74": { username: "yeowheidh", fid: 0, amountStolen: 192500, claims: 17 },
  "0xf61738769e634185320e5dad9666cbb2dd065c32": { username: "clode", fid: 0, amountStolen: 125000, claims: 13 },
  "0xc4bf1e049382d321cbbed969a9204729709eba2f": { username: "bcbxhdud", fid: 0, amountStolen: 107500, claims: 11 },
  "0x324c6c79d03220912261ca5c386446090f6bdc4c": { username: "dimes", fid: 0, amountStolen: 107500, claims: 11 },
  "0xd32dde19b55d0c632cd304c730ef5f3417969424": { username: "sabarud", fid: 0, amountStolen: 107500, claims: 11 },
  "0xd9b2247601de128197000f38c930826bdc62fa4c": { username: "hrvssv", fid: 0, amountStolen: 107500, claims: 11 },
  "0xdff23fcd7af0f1fbb918b47d59c14479040dcc9a": { username: "bbvv", fid: 0, amountStolen: 107500, claims: 11 },
  "0x125197f8aa760f88172f436b566ded5a47d74c7f": { username: "moxiee1", fid: 0, amountStolen: 107500, claims: 11 },
  "0xaef2bf99f130643e81326f8dac7d7ab766c8bdc5": { username: "raes2", fid: 0, amountStolen: 107500, claims: 11 },
  "0xa2c94b5516eaad532767faaec8a66072b98420fc": { username: "jrbdbx", fid: 0, amountStolen: 107500, claims: 11 },
  "0x6d1c81460fa07ca4f394b0071aca07826139ac62": { username: "bevsvs", fid: 0, amountStolen: 107500, claims: 11 },
  "0x192de512fd906d4dc2b2fba88efef5c6964060dd": { username: "yegevs", fid: 0, amountStolen: 107500, claims: 11 },
  "0x54e4e67954cbcec69e1e6b1c14ddba2b15eb837e": { username: "poytr", fid: 0, amountStolen: 107500, claims: 11 },
  "0x804dae25c43e679ff852b3fd8a626d3f190862d3": { username: "uevsvs", fid: 0, amountStolen: 107500, claims: 11 },
  "0xb6f5270216adde7896b4a026af92dae9bf0a1b6f": { username: "hrrgvee", fid: 0, amountStolen: 107500, claims: 12 },
  "0x27a9deac0fd33059251a29217c6f558fa0460f0e": { username: "bsbsvawjd", fid: 0, amountStolen: 107500, claims: 11 },
  "0x68fba4da5b56b5a72f80d2e737e64d636fb4f3b0": { username: "rose", fid: 0, amountStolen: 107500, claims: 12 },
  "0xf147fedadcf61b49d9e71e0c747fdc1b67cc78d1": { username: "vdvsvs", fid: 0, amountStolen: 107500, claims: 11 },
  "0x05414727a5ad7dbef2cc8bcc1548424803d87e27": { username: "ulane", fid: 0, amountStolen: 107500, claims: 11 },
  "0xa45a920f28725a48d8efece069182f72e804880a": { username: "prhevsbz", fid: 0, amountStolen: 107500, claims: 11 },
  "0x04016e6017b45eb96bbdd045225458e90315f5bf": { username: "gesvvsvw", fid: 0, amountStolen: 107500, claims: 11 },
  "0x5072d874d43f3b35ba830e45daab1cc3f6fb462c": { username: "nius", fid: 0, amountStolen: 107500, claims: 12 },
  "0xc7afb4a1a2f821ad160c29e7370cd73824ec5b58": { username: "hanzwwe", fid: 0, amountStolen: 92500, claims: 13 },
  "0x14e9915cc24eafa11c304a6d53eb142fc0dee55a": { username: "fasheng", fid: 0, amountStolen: 92500, claims: 17 },
  "0x384636c26ea99d347196dd8339bab542e15a44da": { username: "kebejj", fid: 0, amountStolen: 35000, claims: 5 },
  "0xb8d364933c26a82b46e9533742fe15c20264881a": { username: "ansatt", fid: 0, amountStolen: 35000, claims: 5 },
  "0x3ae4fa9293265527f9c8d76b83910eaaba20f1cb": { username: "salmane", fid: 0, amountStolen: 22500, claims: 4 },
  // ===== EXPLOIT #3: Multi-account farming (Feb 22, 2026) =====
  "0x9604fb9a88daef5f38681d7518092bd2a8508a65": { username: "unknown", fid: 0, amountStolen: 0, claims: 0 },
  "0xe167bfc5c8f6167fdb7a6667122418e026a4ce26": { username: "unknown", fid: 0, amountStolen: 0, claims: 0 },
  "0x1d7d4da72a32b0ab37b92c773c15412381c7203a": { username: "unknown", fid: 0, amountStolen: 0, claims: 0 },
  "0xd453151b8f811186bbe7b9a62e6537cd68abca3d": { username: "unknown", fid: 0, amountStolen: 0, claims: 0 },
  "0x02d50610393e528c381420c868200eff50f167d7": { username: "unknown", fid: 0, amountStolen: 0, claims: 0 },
  "0xddc754417cae5cd97b00b8fc7fcbae5f573216dd": { username: "unknown", fid: 0, amountStolen: 0, claims: 0 },
  "0xcf60075a449dec39843309c74ff7693baa35b824": { username: "unknown", fid: 0, amountStolen: 0, claims: 0 },
  "0x247116c752420ec7fe870d1549a1c2e8d44675c6": { username: "unknown", fid: 0, amountStolen: 0, claims: 0 },
  // ===== EXPLOIT #3b: Multi-account farming (Feb 23, 2026) =====
  "0x8215db2678e8482dd6051b6847e148ce058ec3b6": { username: "hancox", fid: 1134926, amountStolen: 1510500, claims: 0 },
  // ===== EXPLOIT #4: Multiple signatures via public recovery functions (Feb 27, 2026) =====
  "0x3c21f515b3709348e3e3d7c9446d1972d3393dc4": { username: "unknown", fid: 0, amountStolen: 30000, claims: 6 },
  // ===== EXPLOIT #5: Sybil attack via chickenattack.base.eth (Mar 17, 2026) =====
  // 88 wallets, each claimed 12k VBMS, funneled to 0x0b9b7c1503f3242e992c11cb25d881612a483723 (chickenattack.base.eth)
  "0x0b9b7c1503f3242e992c11cb25d881612a483723": { username: "chickenattack", fid: 0, amountStolen: 1056000, claims: 88 },
  "0x1f4246cec7cee8ae4e3556c7a08b25cedcb01b6d": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x2b34472032bc7fe3b0d3503b882719dd91ff5dc9": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x6e042f02891513c691a6114f102397632b957f71": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xf5961ef0671f6f26af5f6e08e70ea242dc93488c": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xb242c4a4077e0748fd5d73ae19abb426d370f691": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x89b811b18c557a366b188901de1b12d1784955f7": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x778a39aa93215b3ae0cb9b1df6c0b00d54e72550": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x9115aeb942758ea9252c93e3c4adc6293d03f741": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x742ebc870604fcf079ef9375a0ca838ab3d5e9e7": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xdf3002ac81f11090088df65e1ed774e6e78a4e6a": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xa89f178f48cbd4a7089e06b2698ba926a1b18040": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x59b1391c9e7435e2cc771a80fd910bee09aa6aa1": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xd875aaf00a1db3a710ef4e875e4895deea3a044f": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xa2091e9600622b7aa8cca55a2b7f33a6de6f978e": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x23de535a439232d5a771164eac038165c07e0f7b": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x2ed485bfcadcc852fed923985c5bbf25cd6dfbb0": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x000022bbfd7c786d1f082bde7ce48deddd50eac5": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  // === Additional 66 sybil wallets confirmed via Alchemy on-chain data (Mar 17, 2026) ===
  "0x27ab3928d8feaf25c4564fb93e178289574bff7a": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x1cbac8f4428105536491d1052219c54b0946f058": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x6f7706d3fba272d6a38fc8fc3d931cea895a5780": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x63e2351000235d38c81f5a94944588fc995929fd": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x750bf12b45be8fad3749c3052cc6949745c535bf": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x868e47fc6978903590f8832907ea79770cbb0ad5": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x6b17114350b4c85390e0d598403ff81ed8a02790": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xa7b42aaf64580973e9519782f89ea7b0365068a8": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x68705bfab68f2435d4d28deb042ed0f3049cce60": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x5505c9d7e27def08e8ea569e8f0991784877f2f2": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x8e669867563802401209dac9967eee78b9c012c1": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xfe9029ca3278f72eb5d5cf5245834eff69d83414": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x0f3440d8430ed94242d6e016e8d6bd14deb56b1e": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xecbdebc1bbe92cb72158b4501c85beeb2da1545b": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x2cbfbf30307c0d66f02b0ce66f7269954be35741": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x8214f1b808a5179aaa3b0835da2e9e6410161126": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x588361d5cfda9c1cf99527232786acfca7e3956b": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x9867eb7d83e7eec742a49cd90d2a017e3bd0049e": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xdc637ba57838d2ca377b19d650e7d8a3590f70c5": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x19924ec0ac6cecc6693bbce037795175b45d85c4": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x27a97f40cafc4af5d07e53003bb4ebcad1f320e5": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xde36d18aecb1186a7d413e269b64f7142d9c8ce7": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x52906adbac4e65e1d2dd83737f690977ec5908d9": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xa18d7eabf13ab94056d06ce4ffef53dfee4744c3": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x4783624921978e85fe3a0f17fc81a20c8f089051": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x6cef7dc818cbebea5ba52801ab05b199229dfe1d": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x198358efa6fc4fbb5419dacd91d9786291f1f88e": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x27cc7888d3a3adbc7b46294347e8a090c988f8ac": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x5c1e5ec3ddee914efef1d74ba31f36900b0466f6": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x727dddd4eb28768113d3de965af89be967a3c962": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xab0168c23a14e73d1f7d80809c9644daca12d481": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xf1e8c26d2162001dbb2320d74d4651e25a3d5820": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xeff729c12910ec1dd575c9a0d1b5e740ba7b230b": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xb28c3d789ec067583964befc44a5eac57d464928": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x07051034f41039d858bb439e68cd6650ddd16188": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xa1feb9f08cbe28dbcc2ec55244460a39bf5e4003": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xee4d6f4fd991e4a9f81eb83bcbb0d1848764a498": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xc90b9d334921d60db542599fba30982e6cb4f59b": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xf79e32e40f86c69666759a149938db0042e6519f": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xa47939b9697d8284d7ca7efba958b7182d5b318e": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xa5bbb6e01c1d439a9ca55359818d9b96a0ebaad0": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x46eff705c8b178c80d94bab43c000c09aaa02ae3": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x0b8b4f7807ecde8ddd6f17fc0f7d4a851e0a0c59": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x3e3938e2186ef357b97b3cbbb2884dc4fc73b145": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xd09382cefb10815969229c3b90fc035bcf156342": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xc3fa6ca453bb8a5f048ece697a1f24a99ff5575d": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x3cefc2a10e905f9d179de5c7e40e45cb262bb7f7": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x5eda2902bae7f445f0b40685b2b7ece916608f6f": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x3fc6eb73ee2f5a9f1eb2a0ebf6d065ea9d84bf7d": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x3e932ae23c4d389c36159a71c722ada94fa369de": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x9b6e0c8b8490d1e6c1ca40580eb09bf0a81809c0": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xdb672b65e83cff90103bba754653aa1c08a79c37": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x2b38eee323410a1617d2eff991be588e9c1a194e": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xf833b05cdc3120c6844e3ec8dc307411d39a4fd9": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x9e57821e81047d5746cd76c488f9c417645db041": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x62aab4525f355b61eb38242d115944babc35c4c2": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x87a9bf1fb0e5ff1ac24d2e4d5a41a40bd4a3b162": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x10a42aea8679f9a980feec0e96d395ac75dd89a4": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x1cc8c1e1d933d8057b222760d1b9ccb45b635396": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xb7b96e178df7ff8fad2bdfd51aa58a82751e5e27": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xaa52da9398e8afda25b492badb204614c733bda8": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xc3df29b404843da4c493082ef9422adcede1722f": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x419fe2704a3b00bd14a979123535db114789c4d0": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x849925716044778a1e5c13fd11b3e83801b53b43": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x0359be16bd6d8ce4a796a44e86b5c7dec3f93b4e": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0x8eb0ebe3bdb5f400cb3cc5c1ce01cfd58d39110b": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  "0xd43df5342935e9e19bf10f152400612338f24c85": { username: "unknown", fid: 0, amountStolen: 12000, claims: 1 },
  // ===== EXPLOIT #6: ERC-4337 batch sybil (Mar 18, 2026) =====
  // 16 mule wallets used in single bundled tx, funneled to 0x0b9b7c15 (same chickenattack)
  // Note: 0x0b9b7c15 already banned in exploit #5
  "0xcc2ba46344c875855ccda3d9874be1386a47f8ed": { username: "unknown", fid: 0, amountStolen: 10000, claims: 1 },
  "0x3c12c3b705f42c5c10bf22d88f1cd5ffab0c7302": { username: "unknown", fid: 0, amountStolen: 10000, claims: 1 },
  "0x15b5312f492465e5e390c4dd6c46f44b165abbb1": { username: "unknown", fid: 0, amountStolen: 10000, claims: 1 },
  "0x8469ac6ae75805293353d65b854884b0e2c3165b": { username: "unknown", fid: 0, amountStolen: 10000, claims: 1 },
  "0xc8c369c42b290e511f00819add2d409812269364": { username: "unknown", fid: 0, amountStolen: 10000, claims: 1 },
  "0x4c8241d4e5e5d36bb5d4c45e0ff70fb083726ad2": { username: "unknown", fid: 0, amountStolen: 10000, claims: 1 },
  "0xb90721eb7a21864ecdb132d7561270f22b61e773": { username: "unknown", fid: 0, amountStolen: 10000, claims: 1 },
  "0x9d0be64efb43409f21de845656be8a2e91242fa8": { username: "unknown", fid: 0, amountStolen: 10000, claims: 1 },
  "0x594dbaffa1de9a6dee651ab162adab6492bbd480": { username: "unknown", fid: 0, amountStolen: 10000, claims: 1 },
  "0x5a1210376e25ef38b2c4581a7bab6c5bbc87ecda": { username: "unknown", fid: 0, amountStolen: 10000, claims: 1 },
  "0x8df58a3adf91fc31885fdfd62f0267d85c9b96f2": { username: "unknown", fid: 0, amountStolen: 10000, claims: 1 },
  "0x442c6d9a46f557964d30b998f51999decb08a1a1": { username: "unknown", fid: 0, amountStolen: 10000, claims: 1 },
  "0xde5b0ecabf5546e0d14331a3b463c64d3cf66609": { username: "unknown", fid: 0, amountStolen: 10000, claims: 1 },
  "0xb7693bc10f6b5971f9f882be2f2446fd37bad831": { username: "unknown", fid: 0, amountStolen: 10000, claims: 1 },
  "0x14101e429e5d841fb1106dea6af29dbeaaf1c49c": { username: "unknown", fid: 0, amountStolen: 10000, claims: 1 },
  "0x2f16bca7a059cf4548135ebcef348c706ead7f88": { username: "unknown", fid: 0, amountStolen: 10000, claims: 1 },
};

// ========== CHECK BLACKLIST ==========

// ===== EXPLOIT #3: Multi-account farming (Feb 22-23, 2026) =====
const EXPLOIT3_BANNED = new Set([
  "0x9604fb9a88daef5f38681d7518092bd2a8508a65",
  "0xe167bfc5c8f6167fdb7a6667122418e026a4ce26",
  "0x1d7d4da72a32b0ab37b92c773c15412381c7203a",
  "0xd453151b8f811186bbe7b9a62e6537cd68abca3d",
  "0x02d50610393e528c381420c868200eff50f167d7",
  "0xddc754417cae5cd97b00b8fc7fcbae5f573216dd",
  "0xcf60075a449dec39843309c74ff7693baa35b824",
  "0x247116c752420ec7fe870d1549a1c2e8d44675c6",
  "0x8215db2678e8482dd6051b6847e148ce058ec3b6",
]);

// ===== EXPLOIT #4: Pending conversion recover double-spend (Mar 25, 2026) =====
// yareey (FID 898627): converted TESTVBMS on-chain then used recoverPendingConversion to get coins back too
const EXPLOIT4_BANNED = new Set([
  "0x395169ad5db3221ef904d2d05f4b8759d87a25d9",
]);

// ===== EXPLOIT #5: Betting Credits txHash Replay (Mar 27, 2026) =====
// lakasut (FID 1145016): reused same deposit txHash hundreds of times in addBettingCredits
// Root cause: dedup check queried bettingCredits.txHash (only stores first txHash) not bettingTransactions
// Generated ~938k fake TESTVBMS → converted to VBMS on-chain. Total extracted: 1,068,400 TESTVBMS
// Already exploited once before (Feb 26) for roulette/recoverPendingConversion abuse
const EXPLOIT5_BANNED = new Set([
  "0x351d9ac846d3a4e71c2103b91ed7aca67d85be5e",
]);

export function isBlacklisted(address: string): boolean {
  const lower = address.toLowerCase();
  return lower in EXPLOITER_BLACKLIST || EXPLOIT3_BANNED.has(lower) || EXPLOIT4_BANNED.has(lower) || EXPLOIT5_BANNED.has(lower);
}


export function getBlacklistInfo(address: string) {
  return EXPLOITER_BLACKLIST[address.toLowerCase()] || null;
}

// ========== QUERY: Check if Player is Banned ==========

export const checkBan = query({
  args: { address: v.string() },
  handler: async (_ctx, { address }) => {
    if (!address) return { isBanned: false };

    const normalizedAddress = address.toLowerCase();
    if (!isBlacklisted(normalizedAddress)) return { isBanned: false };

    const info = EXPLOITER_BLACKLIST[normalizedAddress];
    return {
      isBanned: true,
      username: info?.username || "unknown",
      amountStolen: info?.amountStolen || 0,
      reason: "This address is permanently banned from Vibe Most Wanted for exploiting game economy.",
    };
  },
});

// ========== QUERY: Get Shame List (for UI) ==========

export const getShameList = query({
  handler: async () => {
    const exploiters = Object.entries(EXPLOITER_BLACKLIST)
      .map(([address, data]) => ({
        address,
        ...data,
      }))
      .sort((a, b) => b.amountStolen - a.amountStolen);

    const totalStolen = exploiters.reduce((sum, e) => sum + e.amountStolen, 0);
    const totalClaims = exploiters.reduce((sum, e) => sum + e.claims, 0);

    return {
      exploiters,
      summary: {
        totalExploiters: exploiters.length,
        totalStolen,
        totalClaims,
        exploitDate: "December 10-12, 2025",
        exploitType: "Race Condition - Multiple Signature Generation",
      },
    };
  },
});

// ========== QUERY: Check if Address is Blacklisted ==========

export const checkBlacklist = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();
    const banned = isBlacklisted(normalizedAddress);
    const info = EXPLOITER_BLACKLIST[normalizedAddress];

    if (banned) {
      return {
        isBlacklisted: true,
        reason: "VBMS Exploit - December 2025",
        ...(info || { username: "unknown", fid: 0, amountStolen: 0, claims: 0 }),
      };
    }

    return {
      isBlacklisted: false,
    };
  },
});

// ========== INTERNAL: Reset Exploiter Balances ==========

export const resetExploiterBalances = internalMutation({
  handler: async (ctx) => {
    return await _zeroAllBlacklisted(ctx);
  },
});

// All blacklisted addresses (all exploit sets combined)
function getAllBlacklistedAddresses(): string[] {
  const from_main = Object.keys(EXPLOITER_BLACKLIST);
  const from_exploit3 = Array.from(EXPLOIT3_BANNED);
  const from_exploit4 = Array.from(EXPLOIT4_BANNED);
  const from_exploit5 = Array.from(EXPLOIT5_BANNED);
  return [...new Set([...from_main, ...from_exploit3, ...from_exploit4, ...from_exploit5])];
}

async function _zeroAllBlacklisted(ctx: any) {
  let resetCount = 0;
  const addresses = getAllBlacklistedAddresses();

  for (const address of addresses) {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", address))
      .first();

    if (profile) {
      const hadCoins = (profile.coins || 0) + (profile.coinsInbox || 0) + (profile.pendingConversion || 0);
      await ctx.db.patch(profile._id, {
        coins: 0,
        coinsInbox: 0,
        pendingConversion: 0,
        pendingConversionTimestamp: undefined,
        pendingNonce: undefined,
      });
      if (hadCoins > 0) resetCount++;
      console.log(`🚫 Zeroed exploiter: ${address}`);
    }

  }

  console.log(`[ZeroBlacklisted] Done. Zeroed ${resetCount} accounts.`);
  return { resetCount, total: addresses.length };
}

// Admin-callable: zero ALL blacklisted addresses (requires secret key)
export const adminZeroAllBlacklisted = mutation({
  args: { adminKey: v.string() },
  handler: async (ctx, { adminKey }) => {
    if (adminKey !== process.env.VMW_INTERNAL_SECRET) throw new Error("Unauthorized");
    const addresses = getAllBlacklistedAddresses();
    let resetCount = 0;
    for (const address of addresses) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q: any) => q.eq("address", address))
        .first();
      if (!profile) continue;
      const had = (profile.coins || 0) + (profile.coinsInbox || 0);
      if (had === 0 && !profile.pendingConversion) continue;
      await ctx.db.patch(profile._id, {
        coins: 0,
        coinsInbox: 0,
        pendingConversion: 0,
        pendingConversionTimestamp: undefined,
        pendingNonce: undefined,
      });
      resetCount++;
    }
    return { resetCount, total: addresses.length };
  },
});

// ========== INTERNAL: Remove Defense Decks from Blacklisted Players ==========

export const removeBlacklistedDefenseDecks = internalMutation({
  handler: async (ctx) => {
    let removedCount = 0;
    const removed: { address: string; username: string; deckSize: number }[] = [];

    for (const address of Object.keys(EXPLOITER_BLACKLIST)) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q: any) => q.eq("address", address))
        .first();

      if (profile && profile.defenseDeck && profile.defenseDeck.length > 0) {
        const deckSize = profile.defenseDeck.length;
        await ctx.db.patch(profile._id, {
          defenseDeck: [], // Clear defense deck
          hasFullDefenseDeck: false, // 🚀 BANDWIDTH FIX
        });
        removedCount++;
        removed.push({
          address,
          username: EXPLOITER_BLACKLIST[address].username,
          deckSize,
        });
        console.log(`🚫 Removed defense deck from exploiter: ${address} (${EXPLOITER_BLACKLIST[address].username}) - had ${deckSize} cards`);
      }
    }

    return { removedCount, removed };
  },
});

// ========== ADMIN: Remove Defense Decks from Blacklisted Players (PUBLIC for admin use) ==========

// 🔒 SECURITY FIX: Changed from mutation to internalMutation
export const adminRemoveBlacklistedDefenseDecks = internalMutation({
  args: {},
  handler: async (ctx) => {
    let removedCount = 0;
    const removed: { address: string; username: string; deckSize: number }[] = [];

    for (const address of Object.keys(EXPLOITER_BLACKLIST)) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q: any) => q.eq("address", address))
        .first();

      if (profile && profile.defenseDeck && profile.defenseDeck.length > 0) {
        const deckSize = profile.defenseDeck.length;
        await ctx.db.patch(profile._id, {
          defenseDeck: [], // Clear defense deck
          hasFullDefenseDeck: false, // 🚀 BANDWIDTH FIX
        });
        removedCount++;
        removed.push({
          address,
          username: EXPLOITER_BLACKLIST[address].username,
          deckSize,
        });
        console.log(`🚫 Removed defense deck from exploiter: ${address} (${EXPLOITER_BLACKLIST[address].username}) - had ${deckSize} cards`);
      }
    }

    return { removedCount, removed };
  },
});

// ========== SHAME BUTTON SYSTEM ==========

const SHAME_REWARD = 50; // was 100 (halved - Vibe Clash is main mode)
const MAX_SHAMES_PER_PLAYER = 10; // Max shames a player can give total

/**
 * Get player's remaining shames and shame counts per exploiter
 */
export const getShameStatus = query({
  args: { playerAddress: v.string() },
  handler: async (ctx, { playerAddress }) => {
    const normalizedAddress = playerAddress.toLowerCase();

    // Get all shame records for this player (max 10 per player)
    const shameRecords = await ctx.db
      .query("shameClicks")
      .withIndex("by_shamer", (q: any) => q.eq("shamerAddress", normalizedAddress))
      .take(20); // 🔒 SECURITY: Limit (max should be 10 per MAX_SHAMES_PER_PLAYER)

    const totalShamesGiven = shameRecords.length;
    const remainingShames = Math.max(0, MAX_SHAMES_PER_PLAYER - totalShamesGiven);

    // Get which exploiters they've shamed
    const shamedExploiters = shameRecords.map(r => r.exploiterAddress);

    return {
      totalShamesGiven,
      remainingShames,
      shamedExploiters,
      maxShames: MAX_SHAMES_PER_PLAYER,
      rewardPerShame: SHAME_REWARD,
    };
  },
});

/**
 * Get total shame counts for all exploiters
 */
/**
 * 🚀 BANDWIDTH FIX: Added limit (1000 max)
 */
export const getExploiterShameCounts = query({
  handler: async (ctx) => {
    // 🚀 BANDWIDTH FIX: Limit to last 1000 shames
    const allShames = await ctx.db.query("shameClicks").order("desc").take(1000);

    // Count shames per exploiter
    const shameCounts: Record<string, number> = {};
    for (const shame of allShames) {
      const addr = shame.exploiterAddress;
      shameCounts[addr] = (shameCounts[addr] || 0) + 1;
    }

    return shameCounts;
  },
});

/**
 * Shame an exploiter and receive 100 VBMS
 */
export const shameExploiter = mutation({
  args: {
    playerAddress: v.string(),
    exploiterAddress: v.string(),
  },
  handler: async (ctx, { playerAddress, exploiterAddress }) => {
    const normalizedPlayer = playerAddress.toLowerCase();
    const normalizedExploiter = exploiterAddress.toLowerCase();

    // Verify exploiter is in blacklist
    if (!isBlacklisted(normalizedExploiter)) {
      throw new Error("This address is not on the shame list");
    }

    // Check if player exists
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", normalizedPlayer))
      .first();

    if (!profile) {
      throw new Error("Player profile not found");
    }

    // Check if player is blacklisted (exploiters can't shame)
    if (isBlacklisted(normalizedPlayer)) {
      throw new Error("Exploiters cannot participate in shaming");
    }

    // Count total shames by this player (max 10 per player)
    const playerShames = await ctx.db
      .query("shameClicks")
      .withIndex("by_shamer", (q: any) => q.eq("shamerAddress", normalizedPlayer))
      .take(20); // 🔒 SECURITY: Limit (max should be 10 per MAX_SHAMES_PER_PLAYER)

    if (playerShames.length >= MAX_SHAMES_PER_PLAYER) {
      throw new Error(`You've reached the maximum of ${MAX_SHAMES_PER_PLAYER} shames`);
    }

    // Check if player already shamed this specific exploiter
    const existingShame = playerShames.find(s => s.exploiterAddress === normalizedExploiter);
    if (existingShame) {
      throw new Error("You've already shamed this exploiter");
    }

    // Record the shame
    await ctx.db.insert("shameClicks", {
      shamerAddress: normalizedPlayer,
      exploiterAddress: normalizedExploiter,
      timestamp: Date.now(),
    });

    // Give reward
    const currentCoins = profile.coins || 0;
    const newCoins = currentCoins + SHAME_REWARD;

    await ctx.db.patch(profile._id, {
      coins: newCoins,
      lifetimeEarned: (profile.lifetimeEarned || 0) + SHAME_REWARD,
    });

    // 📊 Log transaction
    await ctx.db.insert("coinTransactions", {
      address: normalizedPlayer,
      amount: SHAME_REWARD,
      type: "earn",
      source: "shame_reward",
      description: `Shame reward for reporting ${normalizedExploiter.slice(0, 8)}...`,
      timestamp: Date.now(),
      balanceBefore: currentCoins,
      balanceAfter: newCoins,
    });

    const exploiterInfo = getBlacklistInfo(normalizedExploiter);

    // 📊 LOG TRANSACTION
    await logTransaction(ctx, {
      address: normalizedPlayer,
      type: 'bonus',
      amount: SHAME_REWARD,
      source: 'shame',
      description: `Shamed exploiter @${exploiterInfo?.username || 'unknown'}`,
      balanceBefore: currentCoins,
      balanceAfter: newCoins,
    });

    console.log(`🔔 ${normalizedPlayer} shamed @${exploiterInfo?.username}! +${SHAME_REWARD} VBMS. New balance: ${newCoins}`);

    return {
      success: true,
      reward: SHAME_REWARD,
      newBalance: newCoins,
      remainingShames: MAX_SHAMES_PER_PLAYER - playerShames.length - 1,
      exploiterUsername: exploiterInfo?.username,
    };
  },
});

// ========== ADMIN: Dynamic Blacklist ==========

export const adminAddToBlacklist = mutation({
  args: {
    address: v.string(),
    reason: v.optional(v.string()),
    addedBy: v.optional(v.string()),
  },
  handler: async (ctx, { address, reason, addedBy }) => {
    const normalized = address.toLowerCase();
    const existing = await ctx.db
      .query("dynamicBlacklist")
      .withIndex("by_address", (q) => q.eq("address", normalized))
      .first();
    if (existing) return { success: false, message: "Already blacklisted" };
    await ctx.db.insert("dynamicBlacklist", {
      address: normalized,
      reason,
      addedAt: Date.now(),
      addedBy,
    });
    return { success: true };
  },
});

export const adminRemoveFromBlacklist = mutation({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalized = address.toLowerCase();
    const existing = await ctx.db
      .query("dynamicBlacklist")
      .withIndex("by_address", (q) => q.eq("address", normalized))
      .first();
    if (!existing) return { success: false, message: "Not found" };
    await ctx.db.delete(existing._id);
    return { success: true };
  },
});

export const isDynamicBlacklisted = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const entry = await ctx.db
      .query("dynamicBlacklist")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();
    return entry ? { isBanned: true, reason: entry.reason, addedAt: entry.addedAt } : { isBanned: false };
  },
});

// ========== ADMIN: Zero all balances for blacklisted accounts ==========

export const adminZeroBlacklistedBalances = mutation({
  args: {},
  handler: async (ctx) => {
    const allBlacklisted = Object.keys(EXPLOITER_BLACKLIST);
    let coinsReset = 0;
    let creditsReset = 0;
    let packsDeleted = 0;
    let cardsDeleted = 0;

    for (const address of allBlacklisted) {
      // Zero coins in profile
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q: any) => q.eq("address", address))
        .first();
      if (profile) {
        if ((profile.coins || 0) > 0 || (profile.coinsInbox || 0) > 0) {
          await ctx.db.patch(profile._id, { coins: 0, coinsInbox: 0, pendingConversion: 0 });
          coinsReset++;
        }
      }

      // Zero betting credits
      const credits = await ctx.db
        .query("bettingCredits")
        .withIndex("by_address", (q: any) => q.eq("address", address))
        .first();
      if (credits && (credits.balance || 0) > 0) {
        await ctx.db.patch(credits._id, { balance: 0 });
        creditsReset++;
      }

      // Delete all card packs
      const packs = await ctx.db
        .query("cardPacks")
        .withIndex("by_address", (q: any) => q.eq("address", address))
        .collect();
      for (const pack of packs) {
        await ctx.db.delete(pack._id);
        packsDeleted++;
      }

      // Delete all cards from inventory
      const cards = await ctx.db
        .query("cardInventory")
        .withIndex("by_address", (q: any) => q.eq("address", address))
        .collect();
      for (const card of cards) {
        await ctx.db.delete(card._id);
        cardsDeleted++;
      }

      if (packs.length > 0 || cards.length > 0) {
        console.log(`🚫 Wiped ${address}: ${packs.length} packs, ${cards.length} cards`);
      }
    }

    return { coinsReset, creditsReset, packsDeleted, cardsDeleted, total: allBlacklisted.length };
  },
});

// ========== ADMIN: Analyze recent VBMS claimers (last N days) ==========

export const adminAnalyzeRecentClaimers = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days = 3 }) => {
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const recentClaims = await ctx.db
      .query("claimAnalytics")
      .withIndex("by_timestamp", (q: any) => q.gte("timestamp", since))
      .order("desc")
      .take(2000);

    // Aggregate by address
    const byAddress: Record<string, { totalEarned: number; claimCount: number; lastClaim: number }> = {};
    for (const c of recentClaims) {
      const addr = c.playerAddress;
      if (!byAddress[addr]) byAddress[addr] = { totalEarned: 0, claimCount: 0, lastClaim: 0 };
      byAddress[addr].totalEarned += c.amount;
      byAddress[addr].claimCount++;
      if (c.timestamp > byAddress[addr].lastClaim) byAddress[addr].lastClaim = c.timestamp;
    }

    // For each address, get profile info
    const results = [];
    for (const [addr, stats] of Object.entries(byAddress)) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q: any) => q.eq("address", addr))
        .first();
      results.push({
        address: addr,
        username: profile?.username || profile?.farcasterDisplayName || "unknown",
        fid: profile?.farcasterFid || null,
        totalEarned3d: stats.totalEarned,
        claimCount: stats.claimCount,
        currentCoins: profile?.coins || 0,
        lifetimeEarned: profile?.lifetimeEarned || 0,
        pvpWins: profile?.stats?.pvpWins || 0,
        pveWins: profile?.stats?.pveWins || 0,
        createdAt: profile?.createdAt || profile?._creationTime || null,
        isBanned: isBlacklisted(addr),
      });
    }

    return results
      .filter(r => !r.isBanned)
      .sort((a, b) => b.totalEarned3d - a.totalEarned3d)
      .slice(0, 50);
  },
});

// ========== ADMIN: Zero coins + cards for a specific address ==========

export const adminZeroAddress = mutation({
  args: {
    address: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { address, reason }) => {
    const normalized = address.toLowerCase();
    const result: Record<string, any> = { address: normalized, actions: [] };

    // 1. Zero coins in profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", normalized))
      .first();
    if (profile) {
      const oldCoins = profile.coins || 0;
      const oldInbox = profile.coinsInbox || 0;
      await ctx.db.patch(profile._id, { coins: 0, coinsInbox: 0, pendingConversion: 0 });
      result.actions.push(`zeroed coins: ${oldCoins} + inbox: ${oldInbox}`);
    }

    // 2. Zero betting credits
    const credits = await ctx.db
      .query("bettingCredits")
      .withIndex("by_address", (q: any) => q.eq("address", normalized))
      .first();
    if (credits && (credits.balance || 0) > 0) {
      await ctx.db.patch(credits._id, { balance: 0 });
      result.actions.push(`zeroed bettingCredits: ${credits.balance}`);
    }

    // 3. Delete card packs
    const packs = await ctx.db
      .query("cardPacks")
      .withIndex("by_address", (q: any) => q.eq("address", normalized))
      .collect();
    for (const pack of packs) {
      await ctx.db.delete(pack._id);
    }
    if (packs.length > 0) result.actions.push(`deleted ${packs.length} card packs`);

    // 4. Add to dynamic blacklist if not already
    const existing = await ctx.db
      .query("dynamicBlacklist")
      .withIndex("by_address", (q: any) => q.eq("address", normalized))
      .first();
    if (!existing) {
      await ctx.db.insert("dynamicBlacklist", {
        address: normalized,
        reason: reason || "exploit: coin farming",
        addedAt: Date.now(),
        addedBy: "admin",
      });
      result.actions.push("added to blacklist");
    }

    // 5. Audit log entry
    const coinsBefore = profile?.coins || 0;
    if (coinsBefore > 0) {
      await ctx.db.insert("coinAuditLog", {
        playerAddress: normalized,
        type: "spend",
        amount: -coinsBefore,
        balanceBefore: coinsBefore,
        balanceAfter: 0,
        source: "adminZeroAddress",
        sourceId: reason || "exploit: coin farming — admin zero",
        timestamp: Date.now(),
      });
    }

    return result;
  },
});
