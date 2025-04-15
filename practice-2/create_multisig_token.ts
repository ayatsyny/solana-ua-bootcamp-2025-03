import "dotenv/config";
import {
  Connection,
  Keypair,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  createMultisig,
  createMint,
  mintTo,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const connection = new Connection(clusterApiUrl("devnet"));
const asArray = Uint8Array.from(JSON.parse(process.env.PK!));
const payer = Keypair.fromSecretKey(asArray);

// Create multisig signers
const signer1 = Keypair.generate();
const signer2 = Keypair.generate();
const signer3 = Keypair.generate(); // Optional third signer

// 1️⃣ Create a multisig (M = 2 out of N = 3)
const multisigPubkey = await createMultisig(
  connection,
  payer,
  [signer1.publicKey, signer2.publicKey, signer3.publicKey],
  2, // 2 required signatures
);

console.log("✅ Multisig Created:", multisigPubkey.toBase58());

// 2️⃣ Create Mint with multisig as authority
const mint = await createMint(
  connection,
  payer,
  multisigPubkey,
  null,
  0,
  undefined,
  undefined,
  TOKEN_PROGRAM_ID
);

console.log("✅ Mint Created:", mint.toBase58());

// 3️⃣ Create ATA for payer
const recipientATA = await getOrCreateAssociatedTokenAccount(
  connection,
  payer,
  mint,
  payer.publicKey
);

// 4️⃣ Mint tokens — provide multisig *signers* manually
const txSig = await mintTo(
  connection,
  payer,
  mint,
  recipientATA.address,
  multisigPubkey,
  1,
  [signer1, signer2], // required signers
  undefined,
  TOKEN_PROGRAM_ID
);

console.log("✅ Mint TX:", txSig);
