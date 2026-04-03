#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, token, log};

/// Storage keys for the vault
#[contracttype]
pub enum DataKey {
    Balance(Address, Address), // (User, Token)
    LockTime(Address, Address), // (User, Token)
}

#[contract]
pub struct ZenithVault;

#[contractimpl]
impl ZenithVault {
    /// Deposit tokens into the vault.
    /// This demonstrates an INTER-CONTRACT CALL to the token contract.
    pub fn deposit(env: Env, user: Address, token_id: Address, amount: i128) {
        user.require_auth();
        if amount <= 0 {
            panic!("Amount must be positive");
        }


        // 1. Inter-contract call: Transfer from user to this contract
        let client = token::TokenClient::new(&env, &token_id);
        client.transfer(&user, &env.current_contract_address(), &amount);

        // 2. Update balance
        let key = DataKey::Balance(user.clone(), token_id.clone());
        let current_balance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        env.storage().persistent().set(&key, &(current_balance + amount));

        // 3. Set lock-up (e.g., 60 seconds for demo)
        let lock_key = DataKey::LockTime(user.clone(), token_id.clone());
        let current_unlock: u64 = env.storage().persistent().get(&lock_key).unwrap_or(0);
        
        // Anti-Griefing: Only reset the lock if the previous lock has expired!
        if env.ledger().timestamp() >= current_unlock {
            let unlock_at = env.ledger().timestamp() + 60; // 1 minute lock
            env.storage().persistent().set(&lock_key, &unlock_at);
        }

        // Storage Rent: Bump TTL so active accounts don't expire for ~6+ days
        env.storage().persistent().extend_ttl(&key, 50_000, 100_000);
        env.storage().persistent().extend_ttl(&lock_key, 50_000, 100_000);

        log!(&env, "Deposit successful: {} tokens", amount);
    }

    /// Withdraw tokens from the vault.
    pub fn withdraw(env: Env, user: Address, token_id: Address, amount: i128) {
        user.require_auth();
        if amount <= 0 {
            panic!("Amount must be positive");
        }


        // 1. Check lock-up
        let lock_key = DataKey::LockTime(user.clone(), token_id.clone());
        let unlock_at: u64 = env.storage().persistent().get(&lock_key).expect("No lock found");
        if env.ledger().timestamp() < unlock_at {
            panic!("Vault is still locked. Please wait.");
        }

        // 2. Check balance
        let key = DataKey::Balance(user.clone(), token_id.clone());
        let current_balance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if current_balance < amount {
            panic!("Insufficient balance");
        }

        // 3. Inter-contract call: Transfer from this contract back to user
        let client = token::TokenClient::new(&env, &token_id);
        client.transfer(&env.current_contract_address(), &user, &amount);

        // 4. Update balance
        env.storage().persistent().set(&key, &(current_balance - amount));

        // Storage Rent: Bump TTL on withdrawal
        env.storage().persistent().extend_ttl(&key, 50_000, 100_000);
        env.storage().persistent().extend_ttl(&lock_key, 50_000, 100_000);

        log!(&env, "Withdrawal successful: {} tokens", amount);
    }

    pub fn get_balance(env: Env, user: Address, token_id: Address) -> i128 {
        env.storage().persistent().get(&DataKey::Balance(user, token_id)).unwrap_or(0)
    }

    pub fn get_unlock_time(env: Env, user: Address, token_id: Address) -> u64 {
        env.storage().persistent().get(&DataKey::LockTime(user, token_id)).unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
