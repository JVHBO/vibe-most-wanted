import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const { ethers } = hre;

const CLAIM_TYPES = {
  SLOT: 1,
  QUEST: 3,
};

async function deployPoolFixture() {
  const [admin, claimSigner, treasury, player, otherPlayer, attacker] = await ethers.getSigners();

  const token = await ethers.deployContract("MockVBMS", [admin.address]);
  const pool = await ethers.deployContract("VBMSPoolV2", [
    await token.getAddress(),
    admin.address,
    claimSigner.address,
    treasury.address,
  ]);

  await token.mint(await pool.getAddress(), ethers.parseEther("1000000"));

  return { admin, claimSigner, treasury, player, otherPlayer, attacker, token, pool };
}

async function signClaim({
  pool,
  signer,
  player,
  amount,
  claimId,
  claimType,
  deadline,
}: {
  pool: Awaited<ReturnType<typeof ethers.deployContract>>;
  signer: Awaited<ReturnType<typeof ethers.getSigners>>[number];
  player: string;
  amount: bigint;
  claimId: string;
  claimType: number;
  deadline: bigint;
}) {
  const network = await ethers.provider.getNetwork();
  const domain = {
    name: "VBMSPoolV2",
    version: "1",
    chainId: network.chainId,
    verifyingContract: await pool.getAddress(),
  };
  const types = {
    Claim: [
      { name: "player", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "claimId", type: "bytes32" },
      { name: "claimType", type: "uint8" },
      { name: "deadline", type: "uint256" },
    ],
  };

  return signer.signTypedData(domain, types, { player, amount, claimId, claimType, deadline });
}

describe("VBMSPoolV2", function () {
  it("pays a valid EIP-712 claim and records the claim id", async function () {
    const { claimSigner, player, token, pool } = await deployPoolFixture();
    const amount = ethers.parseEther("1000");
    const claimId = ethers.id("slot-claim-1");
    const deadline = BigInt(await time.latest()) + 3600n;
    const signature = await signClaim({
      pool,
      signer: claimSigner,
      player: player.address,
      amount,
      claimId,
      claimType: CLAIM_TYPES.SLOT,
      deadline,
    });

    const poolBalanceBefore = await token.balanceOf(await pool.getAddress());
    const playerBalanceBefore = await token.balanceOf(player.address);
    const tx = await pool.connect(player).claimVBMS(amount, claimId, CLAIM_TYPES.SLOT, deadline, signature);

    await expect(tx)
      .to.emit(pool, "VBMSClaimed")
      .withArgs(player.address, amount, claimId, CLAIM_TYPES.SLOT, claimSigner.address);

    expect(await pool.processedClaimIds(claimId)).to.equal(true);
    expect(await token.balanceOf(await pool.getAddress())).to.equal(poolBalanceBefore - amount);
    expect(await token.balanceOf(player.address)).to.equal(playerBalanceBefore + amount);
  });

  it("rejects replay with the same claim id", async function () {
    const { claimSigner, player, pool } = await deployPoolFixture();
    const amount = ethers.parseEther("1000");
    const claimId = ethers.id("slot-claim-replay");
    const deadline = BigInt(await time.latest()) + 3600n;
    const signature = await signClaim({
      pool,
      signer: claimSigner,
      player: player.address,
      amount,
      claimId,
      claimType: CLAIM_TYPES.SLOT,
      deadline,
    });

    await pool.connect(player).claimVBMS(amount, claimId, CLAIM_TYPES.SLOT, deadline, signature);

    await expect(
      pool.connect(player).claimVBMS(amount, claimId, CLAIM_TYPES.SLOT, deadline, signature),
    ).to.be.revertedWithCustomError(pool, "ClaimAlreadyProcessed");
  });

  it("rejects signatures used by another wallet", async function () {
    const { claimSigner, player, attacker, pool } = await deployPoolFixture();
    const amount = ethers.parseEther("1000");
    const claimId = ethers.id("slot-claim-wrong-wallet");
    const deadline = BigInt(await time.latest()) + 3600n;
    const signature = await signClaim({
      pool,
      signer: claimSigner,
      player: player.address,
      amount,
      claimId,
      claimType: CLAIM_TYPES.SLOT,
      deadline,
    });

    await expect(
      pool.connect(attacker).claimVBMS(amount, claimId, CLAIM_TYPES.SLOT, deadline, signature),
    ).to.be.revertedWithCustomError(pool, "InvalidSignature");
  });

  it("rejects expired claims", async function () {
    const { claimSigner, player, pool } = await deployPoolFixture();
    const amount = ethers.parseEther("1000");
    const claimId = ethers.id("slot-claim-expired");
    const deadline = BigInt(await time.latest()) - 1n;
    const signature = await signClaim({
      pool,
      signer: claimSigner,
      player: player.address,
      amount,
      claimId,
      claimType: CLAIM_TYPES.SLOT,
      deadline,
    });

    await expect(
      pool.connect(player).claimVBMS(amount, claimId, CLAIM_TYPES.SLOT, deadline, signature),
    ).to.be.revertedWithCustomError(pool, "ClaimExpired");
  });

  it("blocks blacklisted wallets", async function () {
    const { admin, claimSigner, player, pool } = await deployPoolFixture();
    const amount = ethers.parseEther("1000");
    const claimId = ethers.id("slot-claim-blacklisted");
    const deadline = BigInt(await time.latest()) + 3600n;
    const signature = await signClaim({
      pool,
      signer: claimSigner,
      player: player.address,
      amount,
      claimId,
      claimType: CLAIM_TYPES.SLOT,
      deadline,
    });

    await pool.connect(admin).setBlacklisted(player.address, true);

    await expect(
      pool.connect(player).claimVBMS(amount, claimId, CLAIM_TYPES.SLOT, deadline, signature),
    ).to.be.revertedWithCustomError(pool, "AddressBlacklisted");
  });

  it("enforces the global daily outflow limit across wallets", async function () {
    const { admin, claimSigner, player, otherPlayer, pool } = await deployPoolFixture();
    const amount = ethers.parseEther("1000");
    const deadline = BigInt(await time.latest()) + 3600n;

    await pool.connect(admin).setGlobalDailyOutflowLimit(ethers.parseEther("1500"));

    const firstClaimId = ethers.id("slot-global-limit-1");
    const firstSignature = await signClaim({
      pool,
      signer: claimSigner,
      player: player.address,
      amount,
      claimId: firstClaimId,
      claimType: CLAIM_TYPES.SLOT,
      deadline,
    });
    await pool.connect(player).claimVBMS(amount, firstClaimId, CLAIM_TYPES.SLOT, deadline, firstSignature);

    const secondClaimId = ethers.id("slot-global-limit-2");
    const secondSignature = await signClaim({
      pool,
      signer: claimSigner,
      player: otherPlayer.address,
      amount,
      claimId: secondClaimId,
      claimType: CLAIM_TYPES.QUEST,
      deadline,
    });

    await expect(
      pool.connect(otherPlayer).claimVBMS(amount, secondClaimId, CLAIM_TYPES.QUEST, deadline, secondSignature),
    ).to.be.revertedWithCustomError(pool, "GlobalOutflowLimitExceeded");
  });

  it("allows treasury emergency withdraw only while paused", async function () {
    const { admin, treasury, token, pool } = await deployPoolFixture();
    const amount = ethers.parseEther("1000");

    await expect(
      pool.connect(treasury).emergencyWithdraw(await token.getAddress(), treasury.address, amount),
    ).to.be.reverted;

    await pool.connect(admin).pause();

    const poolBalanceBefore = await token.balanceOf(await pool.getAddress());
    const treasuryBalanceBefore = await token.balanceOf(treasury.address);
    const tx = await pool.connect(treasury).emergencyWithdraw(await token.getAddress(), treasury.address, amount);

    await expect(tx)
      .to.emit(pool, "EmergencyWithdraw")
      .withArgs(await token.getAddress(), treasury.address, amount);

    expect(await token.balanceOf(await pool.getAddress())).to.equal(poolBalanceBefore - amount);
    expect(await token.balanceOf(treasury.address)).to.equal(treasuryBalanceBefore + amount);
  });
});
