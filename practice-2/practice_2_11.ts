import "dotenv/config";
import {
  Connection,
  Keypair,
  Transaction,
  clusterApiUrl,
  SystemProgram,
  NONCE_ACCOUNT_LENGTH,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

// Setup
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.SENDER_PK!)));
const otherParty = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.RECIPIENT_PK!)));

console.log("🔑 Payer:", payer.publicKey.toBase58());
console.log("🔑 Other Party:", otherParty.publicKey.toBase58());

// Create nonce account
const nonceAccount = Keypair.generate();
const nonceRent = await connection.getMinimumBalanceForRentExemption(NONCE_ACCOUNT_LENGTH);

// Fund and create the nonce account
const createNonceIx = SystemProgram.createAccount({
  fromPubkey: payer.publicKey,
  newAccountPubkey: nonceAccount.publicKey,
  lamports: nonceRent,
  space: NONCE_ACCOUNT_LENGTH,
  programId: SystemProgram.programId,
});

const initNonceIx = SystemProgram.nonceInitialize({
  noncePubkey: nonceAccount.publicKey,
  authorizedPubkey: payer.publicKey,
});

const setupTx = new Transaction().add(createNonceIx, initNonceIx);
await sendAndConfirmTransaction(connection, setupTx, [payer, nonceAccount]);
console.log("📦 Nonce account created:", nonceAccount.publicKey.toBase58());

// Get nonce value
const nonceInfo = await connection.getNonce(nonceAccount.publicKey);
const durableNonce = nonceInfo?.nonce;
if (!durableNonce) throw new Error("Failed to fetch nonce");

// === Create a transaction using the nonce ===

// 1. Add nonceAdvance first
const nonceAdvanceIx = SystemProgram.nonceAdvance({
  noncePubkey: nonceAccount.publicKey,
  authorizedPubkey: payer.publicKey,
});

// 2. Add a dummy instruction (you can replace this with a real one)
const transferIx = SystemProgram.transfer({
  fromPubkey: payer.publicKey,
  toPubkey: otherParty.publicKey,
  lamports: 10000, // 0.00001 SOL
});

const tx = new Transaction({
  feePayer: otherParty.publicKey,
  nonceInfo: {
    nonce: durableNonce,
    nonceInstruction: nonceAdvanceIx,
  },
}).add(transferIx);

// 3. Partial sign by payer
tx.partialSign(payer);

// 4. Simulate delay
console.log("⏳ Waiting for 2+ minutes before signing...");
await new Promise((resolve) => setTimeout(resolve, 125000)); // ~2 mins 5 sec

// 5. Other party signs and sends
tx.partialSign(otherParty);
try {
  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  console.log("✅ Sent durable nonce transaction:", sig);
} catch (err) {
  console.error("❌ Failed to send transaction:", err);
}
