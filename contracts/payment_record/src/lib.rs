//! # Payment Record — Soroban Smart Contract
//!
//! A minimal on-chain record-keeping contract for Zenith payment intents.
//! This contract does NOT hold funds. It logs payment metadata only.
//!
//! ## Functions
//! - `record_payment(sender, recipient, amount) -> u32` — stores a record, returns auto-increment ID
//! - `get_payment(payment_id: u32) -> PaymentRecord` — retrieves a stored record by ID
//!
//! ## Deployment target
//! Stellar Testnet (Soroban)
//! Network passphrase: "Test SDF Network ; September 2015"

#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, log};

/// A single payment record stored on-chain.
#[contracttype]
#[derive(Clone, Debug)]
pub struct PaymentRecord {
    pub sender: Address,
    pub recipient: Address,
    pub amount: i128,
    pub timestamp: u32, // ledger sequence number
}

/// Storage key for the auto-incrementing counter
const COUNTER_KEY: &str = "counter";

/// Generate a storage key for a payment ID
#[contracttype]
pub enum DataKey {
    Payment(u32),
    Counter,
}

#[contract]
pub struct PaymentRecordContract;

#[contractimpl]
impl PaymentRecordContract {
    /// Record a payment intent on-chain.
    ///
    /// # Arguments
    /// * `sender` — the address initiating the payment
    /// * `recipient` — the destination address
    /// * `amount` — amount in stroops as i128
    ///
    /// # Returns
    /// Auto-incrementing `payment_id` (u32)
    pub fn record_payment(
        env: Env,
        sender: Address,
        recipient: Address,
        amount: i128,
    ) -> u32 {
        // Get and increment the counter
        let mut counter: u32 = env
            .storage()
            .instance()
            .get(&DataKey::Counter)
            .unwrap_or(0);
        counter += 1;

        // Create the payment record
        let record = PaymentRecord {
            sender,
            recipient,
            amount,
            timestamp: env.ledger().sequence(),
        };

        // Store the record
        env.storage()
            .persistent()
            .set(&DataKey::Payment(counter), &record);

        // Update the counter
        env.storage()
            .instance()
            .set(&DataKey::Counter, &counter);

        log!(&env, "Payment recorded with ID: {}", counter);

        counter
    }

    /// Retrieve a payment record by ID.
    ///
    /// # Arguments
    /// * `payment_id` — the ID returned by `record_payment`
    ///
    /// # Returns
    /// The stored `PaymentRecord`
    ///
    /// # Panics
    /// Panics if no record exists for the given ID
    pub fn get_payment(env: Env, payment_id: u32) -> PaymentRecord {
        env.storage()
            .persistent()
            .get(&DataKey::Payment(payment_id))
            .expect("Payment not found")
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::Env;

    #[test]
    fn test_record_and_get_payment() {
        let env = Env::default();
        let contract_id = env.register_contract(None, PaymentRecordContract);
        let client = PaymentRecordContractClient::new(&env, &contract_id);

        let sender = Address::generate(&env);
        let recipient = Address::generate(&env);
        let amount: i128 = 100_000_000; // 10 XLM in stroops

        // Record payment
        let id = client.record_payment(&sender, &recipient, &amount);
        assert_eq!(id, 1);

        // Retrieve payment
        let record = client.get_payment(&id);
        assert_eq!(record.sender, sender);
        assert_eq!(record.recipient, recipient);
        assert_eq!(record.amount, amount);

        // Record another payment
        let id2 = client.record_payment(&sender, &recipient, &200_000_000i128);
        assert_eq!(id2, 2);
    }
}
