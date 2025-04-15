use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
};
use spl_associated_token_account::{
    get_associated_token_address,
    instruction::create_associated_token_account,
};
use std::{env, str::FromStr};
use dotenv::dotenv;


fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();

    // Read private key from .env
    let pk_string = env::var("PK").expect("Missing PK env var");
    let pk_bytes: Vec<u8> = serde_json::from_str(&pk_string)?;
    let pk_array: [u8; 64] = pk_bytes.try_into().expect("Invalid PK length");
    let sender = Keypair::from_bytes(&pk_array)?;

    let rpc_url = "https://api.devnet.solana.com";
    let client = RpcClient::new_with_commitment(rpc_url.to_string(), CommitmentConfig::confirmed());

    println!("🔑 Our public key is: {}", sender.pubkey());

    let token_mint = Pubkey::from_str("HgsFoDVWWmZyTgJbGVKsYtd9WQzK9tHfdVDeNPmvuPTK")?;
    let recipient = Pubkey::from_str("7BfEoH7SMjX4LJBSF9AJEP3Empnr8vqorRNB3j5c52SG")?;

  // Get the ATA
  let ata = get_associated_token_address(&recipient, &token_mint);

  // Check if ATA exists
  let account = client.get_account(&ata);

  if account.is_err() {
      println!("⚠️ Associated Token Account doesn't exist. Creating...");

      // Build instruction to create ATA
      let ix = create_associated_token_account(
          &sender.pubkey(), // funder
          &recipient,
          &token_mint,
          &spl_token::ID,
      );

      // Build and send transaction
      let blockhash = client.get_latest_blockhash()?;
      let tx = Transaction::new_signed_with_payer(
          &[ix],
          Some(&sender.pubkey()),
          &[&sender],
          blockhash,
      );

      client.send_and_confirm_transaction(&tx)?;
      println!("✅ Created Associated Token Account: {}", ata);
  } else {
      println!("ℹ️ Associated Token Account already exists: {}", ata);
  }

  println!(
      "🔗 Explorer: https://explorer.solana.com/address/{}?cluster=devnet",
      ata
  );

    Ok(())
}
