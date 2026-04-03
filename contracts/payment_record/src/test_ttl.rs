#![no_std]
use soroban_sdk::{contract, contractimpl, Env, Symbol};

#[contract]
pub struct TestContract;

#[contractimpl]
impl TestContract {
    pub fn test(env: Env) {
        env.storage().instance().extend_ttl(100, 500);
    }
}
