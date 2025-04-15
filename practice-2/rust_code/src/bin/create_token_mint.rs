use std::env;
use dotenv::dotenv;

use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    program_pack::Pack,
    signature::{Keypair, Signer},
};
use spl_token::instruction::initialize_mint;
use spl_token::state::Mint;
use solana_sdk::transaction::Transaction;
use solana_sdk::message::Message;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();

    let pk_string = env::var("PK").expect("Missing PK env var");
    let pk_bytes: Vec<u8> = serde_json::from_str(&pk_string)?;
    let pk_array: [u8; 64] = pk_bytes.try_into().expect("Invalid length for secret key");

    let sender = Keypair::from_bytes(&pk_array)?;

    let connection = RpcClient::new_with_commitment(
        "https://api.devnet.solana.com".to_string(),
        CommitmentConfig::confirmed(),
    );

    println!("🔑 Our public key is: {}", sender.pubkey());

    // Create mint account
    let mint = Keypair::new();
    let rent = connection.get_minimum_balance_for_rent_exemption(Mint::LEN)?;

    let recent_blockhash = connection.get_latest_blockhash()?;

    let create_account_ix = solana_sdk::system_instruction::create_account(
        &sender.pubkey(),
        &mint.pubkey(),
        rent,
        Mint::LEN as u64,
        &spl_token::id(),
    );

    let init_mint_ix = initialize_mint(
        &spl_token::id(),
        &mint.pubkey(),
        &sender.pubkey(),
        None,
        2,
    )?;

    let message = Message::new(&[create_account_ix, init_mint_ix], Some(&sender.pubkey()));
    let mut transaction = Transaction::new_unsigned(message);
    transaction.sign(&[&sender, &mint], recent_blockhash);

    connection.send_and_confirm_transaction(&transaction)?;

    println!(
        "✅ Token Mint: https://explorer.solana.com/address/{}?cluster=devnet",
        mint.pubkey()
    );

    Ok(())
}