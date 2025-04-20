import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { Favorites } from "../target/types/favorites";
import { airdropIfRequired, getCustomErrorMessage } from "@solana-developers/helpers";
import { expect, describe, it } from '@jest/globals';
import { systemProgramErrors } from "./system-program-errors";


describe("favorites", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  it("Writes our favorites to the blockchain", async () => {
    const user = web3.Keypair.generate();
    const program = anchor.workspace.Favorites as Program<Favorites>;

    console.log(`User public key: ${user.publicKey}`);

    await airdropIfRequired(
      anchor.getProvider().connection,
      user.publicKey,
      0.5 * web3.LAMPORTS_PER_SOL,
      1 * web3.LAMPORTS_PER_SOL
    );

    // Here's what we want to write to the blockchain
    const favoriteNumber = new anchor.BN(23);
    const favoriteColor = "red";

        // Make a transaction to write to the blockchain
    let tx: string | null = null;
    try {
      tx = await program.methods
        // Call the set_favorites instruction handler
        .setFavorites(favoriteNumber, favoriteColor)
        .accounts({
          user: user.publicKey,
          // Note that both `favorites` and `system_program` are added
          // automatically.
        })
        // Sign the transaction
        .signers([user])
        // Send the transaction to the cluster or RPC
        .rpc();
    } catch (thrownObject) {
      // Let's properly log the error, so we can see the program involved
      // and (for well known programs) the full log message.

      const rawError = thrownObject as Error;
      console.error("Raw error object:", rawError);
      const message = rawError?.message || "Unknown error";
      throw new Error(getCustomErrorMessage(systemProgramErrors, message));
    }

    console.log(`Tx signature: ${tx}`);

        // Calculate the PDA account address that holds the user's favorites
    const [favoritesPda, _favoritesBump] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("favorites"), user.publicKey.toBuffer()],
      program.programId
    );

        // And make sure it matches!
    const dataFromPda = await program.account.favorites.fetch(favoritesPda);
    expect(dataFromPda.color).toEqual(favoriteColor);
    expect(dataFromPda.number.toNumber()).toEqual(favoriteNumber.toNumber());

  });


  it("Updates the user's favorite number and color", async () => {
    const user = web3.Keypair.generate();
    const program = anchor.workspace.Favorites as Program<Favorites>;
  
    await airdropIfRequired(
      anchor.getProvider().connection,
      user.publicKey,
      0.5 * web3.LAMPORTS_PER_SOL,
      1 * web3.LAMPORTS_PER_SOL
    );
  
    const initialNumber = new anchor.BN(7);
    const initialColor = "blue";
  
    await program.methods
      .setFavorites(initialNumber, initialColor)
      .accounts({
        user: user.publicKey,
      })
      .signers([user])
      .rpc();
  
    const newNumber = new anchor.BN(42);
    const newColor = "purple";
  
    await program.methods
      .updateFavorites(
        newNumber,
        newColor
      )
      .accounts({
        user: user.publicKey,
      })
      .signers([user])
      .rpc();

    const [favoritesPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("favorites"), user.publicKey.toBuffer()],
      program.programId
    );
  
    const updated = await program.account.favorites.fetch(favoritesPda);
  
    expect(updated.number.toNumber()).toBe(newNumber.toNumber());
    expect(updated.color).toBe(newColor);
  });
  
  it("Partially updates only the color field", async () => {
    const user = web3.Keypair.generate();
    const program = anchor.workspace.Favorites as Program<Favorites>;
  
    await airdropIfRequired(
      anchor.getProvider().connection,
      user.publicKey,
      0.5 * web3.LAMPORTS_PER_SOL,
      1 * web3.LAMPORTS_PER_SOL
    );
  
    const initialNumber = new anchor.BN(42);
    const initialColor = "blue";
  
    await program.methods
      .setFavorites(initialNumber, initialColor)
      .accounts({ user: user.publicKey })
      .signers([user])
      .rpc();
  
    const newColor = "green";
    const updatedNumber: null = null;
  
    await program.methods
      .updateFavorites(updatedNumber, newColor)
      .accounts({ user: user.publicKey })
      .signers([user])
      .rpc();
  
    const [favoritesPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("favorites"), user.publicKey.toBuffer()],
      program.programId
    );
  
    const updatedData = await program.account.favorites.fetch(favoritesPda);
    expect(updatedData.color).toEqual(newColor);
    expect(updatedData.number.toNumber()).toEqual(42);
  });
  
  it("Partially updates only the number field", async () => {
    const user = web3.Keypair.generate();
    const program = anchor.workspace.Favorites as Program<Favorites>;
  
    await airdropIfRequired(
      anchor.getProvider().connection,
      user.publicKey,
      0.5 * web3.LAMPORTS_PER_SOL,
      1 * web3.LAMPORTS_PER_SOL
    );
  
    const initialNumber = new anchor.BN(88);
    const initialColor = "purple";
  
    await program.methods
      .setFavorites(initialNumber, initialColor)
      .accounts({ user: user.publicKey })
      .signers([user])
      .rpc();
  
    const newNumber = new anchor.BN(1234);
    const updatedColor: null = null;
  
    await program.methods
      .updateFavorites(newNumber, updatedColor)
      .accounts({ user: user.publicKey })
      .signers([user])
      .rpc();
  
    const [favoritesPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("favorites"), user.publicKey.toBuffer()],
      program.programId
    );
  
    const updatedData = await program.account.favorites.fetch(favoritesPda);
    expect(updatedData.number.toNumber()).toEqual(newNumber.toNumber());
    expect(updatedData.color).toEqual(initialColor);
  });
});
