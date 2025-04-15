import "dotenv/config";
import {
  Connection,
  Keypair,
  Transaction,
  PublicKey,
  clusterApiUrl
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const connection = new Connection(clusterApiUrl("devnet"));
const sender = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.SENDER_PK!)));
const recipient = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.RECIPIENT_PK!)));
const mint = new PublicKey("Gy24HX7yLhkwJRfjV4XaBbASiMRQbjRSbozRxHuBqaKP");

console.log("👤 Sender:   ", sender.publicKey.toBase58());
console.log("👤 Recipient:", recipient.publicKey.toBase58());

const senderTokenAccount = await getOrCreateAssociatedTokenAccount(connection, sender, mint, sender.publicKey);
const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(connection, sender, mint, recipient.publicKey);

const DECIMALS = 2;
const AMOUNT = 10 * 10 ** DECIMALS;

let senderBalance = (await connection.getTokenAccountBalance(senderTokenAccount.address)).value.uiAmount ?? 0;
if (senderBalance < AMOUNT / 10 ** DECIMALS) {
  console.log("⛏ Minting tokens to sender...");
  await mintTo(connection, sender, mint, senderTokenAccount.address, sender, AMOUNT);
  senderBalance = (await connection.getTokenAccountBalance(senderTokenAccount.address)).value.uiAmount ?? 0;
}
console.log("💸 Sender balance:   ", senderBalance);

const recipientSol = await connection.getBalance(recipient.publicKey);
if (recipientSol < 0.001 * 1e9) {
  console.log("💸 Airdropping 1 SOL to recipient...");
  const sig = await connection.requestAirdrop(recipient.publicKey, 1 * 1e9);
  await connection.confirmTransaction(sig, "confirmed");
}
let recipientBalance = (await connection.getTokenAccountBalance(recipientTokenAccount.address)).value.uiAmount ?? 0;
console.log("💸 Recipient balance:   ", recipientBalance);

// Build and send transaction
const transferIx = createTransferInstruction(
  senderTokenAccount.address,
  recipientTokenAccount.address,
  sender.publicKey,
  AMOUNT,
  [],
  TOKEN_PROGRAM_ID
);

const tx = new Transaction().add(transferIx);
tx.feePayer = recipient.publicKey;
tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

// Sign with both parties
tx.partialSign(sender);
tx.partialSign(recipient);

// Send
try {
  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  console.log("✅ Transaction sent! Signature:", sig);
} catch (err) {
  console.error("❌ Failed to send transaction:", err);
}
