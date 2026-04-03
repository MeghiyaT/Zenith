use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{token, Env};

#[test]
fn test_vault_deposit_and_withdraw_successful() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, ZenithVault);
    let client = ZenithVaultClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    
    // Setup Mock Token (SAC)
    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract(token_admin.clone());
    let token_client = token::TokenClient::new(&env, &token_id);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_id);

    // Mint tokens to user
    token_admin_client.mint(&user, &1000);
    assert_eq!(token_client.balance(&user), 1000);

    // Deposit to Vault
    client.deposit(&user, &token_id, &500);
    assert_eq!(token_client.balance(&user), 500);
    assert_eq!(token_client.balance(&contract_id), 500);
    assert_eq!(client.get_balance(&user), 500);

    // Fast-forward ledger time to unlock
    env.ledger().with_mut(|li| li.timestamp = 100); 

    // Withdraw from Vault
    client.withdraw(&user, &token_id, &300);
    assert_eq!(token_client.balance(&user), 800);
    assert_eq!(client.get_balance(&user), 200);
}

#[test]
#[should_panic(expected = "Vault is still locked. Please wait.")]
fn test_vault_withdrawal_locked() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, ZenithVault);
    let client = ZenithVaultClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract(token_admin.clone());
    let token_admin_client = token::StellarAssetClient::new(&env, &token_id);

    token_admin_client.mint(&user, &1000);
    client.deposit(&user, &token_id, &500);

    // Attempt withdrawal while locked (ledger timestamp 0 < 60)
    client.withdraw(&user, &token_id, &200);
}
