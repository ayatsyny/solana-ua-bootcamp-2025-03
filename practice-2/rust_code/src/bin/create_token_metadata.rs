use dotenv::dotenv;
use mpl_token_metadata::instructions::CreateMetadataAccountV3Builder;
use mpl_token_metadata::types::DataV2;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
};
use std::{env, str::FromStr};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();

    // Load private key from .env
    let pk_string = env::var("PK").expect("Missing PK env var");
    let pk_bytes: Vec<u8> = serde_json::from_str(&pk_string)?;
    let pk_array: [u8; 64] = pk_bytes.try_into().expect("Invalid PK length");
    let user = Keypair::from_bytes(&pk_array)?;

    // Create Solana RPC client
    let client = RpcClient::new_with_commitment(
        "https://api.devnet.solana.com".to_string(),
        CommitmentConfig::confirmed(),
    );

    let token_mint = Pubkey::from_str("HgsFoDVWWmZyTgJbGVKsYtd9WQzK9tHfdVDeNPmvuPTK")?;

    let metadata = DataV2 {
        name: "Rust Bootcamp 2025-03-19".to_string(),
        symbol: "UAB-3".to_string(),
        uri: "https://arweave.net/1234".to_string(),
        seller_fee_basis_points: 0,
        creators: None,
        collection: None,
        uses: None,
    };

    // Build instruction using the v5.1.0 builder API
    let ix = CreateMetadataAccountV3Builder::new()
        .metadata(token_metadata_pda(&token_mint))
        .mint(token_mint)
        .mint_authority(user.pubkey())
        .payer(user.pubkey())
        .update_authority(user.pubkey(), true)
        .is_mutable(true)
        .data(metadata)
        .instruction();

    let mut tx = Transaction::new_with_payer(&[ix], Some(&user.pubkey()));
    let blockhash = client.get_latest_blockhash()?;
    tx.sign(&[&user], blockhash);

    let sig = client.send_and_confirm_transaction(&tx)?;

    println!("✅ Metadata created!");
    println!(
        "Token Mint: https://explorer.solana.com/address/{}?cluster=devnet",
        token_mint
    );
    println!(
        "Transaction: https://explorer.solana.com/tx/{}?cluster=devnet",
        sig
    );

    Ok(())
}

// Helper for metadata PDA
fn token_metadata_pda(mint: &Pubkey) -> Pubkey {
    let seeds = &[
        b"metadata",
        mpl_token_metadata::ID.as_ref(),
        mint.as_ref(),
    ];
    Pubkey::find_program_address(seeds, &mpl_token_metadata::ID).0
}
