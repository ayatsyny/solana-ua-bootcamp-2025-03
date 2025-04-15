use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    instruction::{AccountMeta, Instruction},
    message::Message,
    native_token::LAMPORTS_PER_SOL,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_instruction,
    transaction::Transaction,
};
use std::{env, str::FromStr};
use dotenv::dotenv;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();

    // Load PK from .env as JSON-encoded byte array
    let pk_string = env::var("PK").expect("Missing PK env var");
    let pk_bytes: Vec<u8> = serde_json::from_str(&pk_string)
        .expect("Invalid JSON for PK");
    let pk_array: [u8; 64] = pk_bytes.try_into()
        .expect("Invalid key length");
    let sender = Keypair::from_bytes(&pk_array)?;

    println!("🔑 Public Key: {}", sender.pubkey());

    // RPC client
    let rpc_url = "https://api.devnet.solana.com".to_string();
    let connection = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::confirmed());

    // Set recipient (change this!)
    let recipient = Pubkey::from_str("7BfEoH7SMjX4LJBSF9AJEP3Empnr8vqorRNB3j5c52SG")?;

    // Transfer instruction (0.01 SOL)
    let lamports = (0.01 * LAMPORTS_PER_SOL as f64) as u64;
    let transfer_ix = system_instruction::transfer(&sender.pubkey(), &recipient, lamports);

    // Memo instruction
    let memo_program_id = Pubkey::from_str("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")?;
    let memo_text = "Hello from Solana my first memoText!";
    println!("📝 Memo: {}", memo_text);
    let memo_ix = Instruction {
        program_id: memo_program_id,
        accounts: vec![AccountMeta::new(sender.pubkey(), true)],
        data: memo_text.as_bytes().to_vec(),
    };

    // Combine instructions
    let message = Message::new(&[transfer_ix, memo_ix], Some(&sender.pubkey()));
    let mut transaction = Transaction::new_unsigned(message);
    let recent_blockhash = connection.get_latest_blockhash()?;
    transaction.sign(&[&sender], recent_blockhash);

    // Send and confirm
    let signature = connection.send_and_confirm_transaction(&transaction)?;
    println!("✅ Signature: {}", signature);

    Ok(())
}
