use std::{env, str::FromStr};

use dotenv::dotenv;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
};
use spl_token::{
    instruction::mint_to,
    ID as TOKEN_PROGRAM_ID,
};
use solana_sdk::transaction::Transaction;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();

    // Load private key from .env
    let pk_string = env::var("PK").expect("Missing PK in .env");
    let pk_bytes: Vec<u8> = serde_json::from_str(&pk_string)?;
    let pk_array: [u8; 64] = pk_bytes.try_into().expect("Invalid PK length");
    let sender = Keypair::from_bytes(&pk_array)?;

    let rpc_url = "https://api.devnet.solana.com";
    let client = RpcClient::new_with_commitment(rpc_url.to_string(), CommitmentConfig::confirmed());

    // Constants
    let decimals = 2u64;
    let amount = 10 * 10u64.pow(decimals as u32);

    let token_mint = Pubkey::from_str("HgsFoDVWWmZyTgJbGVKsYtd9WQzK9tHfdVDeNPmvuPTK")?;
    let recipient_token_account = Pubkey::from_str("A7RuTRpzyKGhunyTWa4dgJJVhRKz1jdiozRMG3idxbYG")?;

    let recent_blockhash = client.get_latest_blockhash()?;

    let ix = mint_to(
        &TOKEN_PROGRAM_ID,
        &token_mint,
        &recipient_token_account,
        &sender.pubkey(),
        &[],
        amount,
    )?;

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&sender.pubkey()),
        &[&sender],
        recent_blockhash,
    );

    let sig = client.send_and_confirm_transaction(&tx)?;

    println!("✅ Success!");
    println!(
        "Mint Token Transaction: https://explorer.solana.com/tx/{}?cluster=devnet",
        sig
    );

    Ok(())
}
