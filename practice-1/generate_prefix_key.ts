import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const TARGET_PREFIX = "a"; // Change this to your desired prefix

function findKeypairWithPrefix(prefix) {
    let attempts = 0;
    while (true) {
        const keypair = Keypair.generate();
        const pubKeyBase58 = keypair.publicKey.toBase58();
        attempts++;

        if (pubKeyBase58.startsWith(prefix)) {
            console.log(`Found matching key after ${attempts} attempts!`);
            console.log("Public Key:", pubKeyBase58);
            console.log("Private Key (Base58):", bs58.encode(keypair.secretKey));
            return keypair;
        }

        if (attempts % 1000 === 0) {
            console.log(`${attempts} attempts so far...`);
        }
    }
}

findKeypairWithPrefix(TARGET_PREFIX);