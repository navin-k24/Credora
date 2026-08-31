#![cfg(test)]
use super::*;
use soroban_sdk::{
    testutils::Address as _,
    Address, BytesN, Env, String,
};

#[test]
fn test_end_to_end_flow() {
    let env = Env::default();
    env.mock_all_auths();

    // Register contract
    let contract_id = env.register(CredoraContract, ());
    let client = CredoraContractClient::new(&env, &contract_id);

    // Generate addresses
    let admin = Address::generate(&env);
    let issuer = Address::generate(&env);
    let student = Address::generate(&env);

    // Initialize
    client.init(&admin);
    assert_eq!(client.get_admin(), Some(admin.clone()));

    // Verify issuer is not yet authorized
    assert!(!client.is_issuer(&issuer));

    // Admin adds issuer
    let school_name = String::from_str(&env, "Stellar University");
    client.add_issuer(&admin, &issuer, &school_name);
    assert!(client.is_issuer(&issuer));

    let issuer_info = client.get_issuer_info(&issuer).unwrap();
    assert_eq!(issuer_info.name, school_name);

    // Issue a certificate
    let cert_id = String::from_str(&env, "CERT-2026-001");
    let doc_hash = BytesN::from_array(&env, &[7u8; 32]);
    let metadata = String::from_str(&env, "{\"course\":\"Introduction to Soroban\",\"grade\":\"A\"}");

    client.issue_certificate(&issuer, &cert_id, &student, &doc_hash, &metadata);

    // Fetch and check certificate details
    let cert = client.get_certificate(&cert_id).unwrap();
    assert_eq!(cert.id, cert_id);
    assert_eq!(cert.issuer, issuer);
    assert_eq!(cert.recipient, student);
    assert_eq!(cert.doc_hash, doc_hash);
    assert_eq!(cert.metadata, metadata);
    assert!(!cert.revoked);

    // Verify certificate
    assert!(client.verify_certificate(&cert_id, &doc_hash));

    // Verify with invalid hash should fail
    let bad_hash = BytesN::from_array(&env, &[9u8; 32]);
    assert!(!client.verify_certificate(&cert_id, &bad_hash));

    // Revoke certificate
    client.revoke_certificate(&issuer, &cert_id);
    
    // Certificate details should show revoked = true
    let cert_after_revocation = client.get_certificate(&cert_id).unwrap();
    assert!(cert_after_revocation.revoked);

    // Verify should now return false since it is revoked
    assert!(!client.verify_certificate(&cert_id, &doc_hash));
}

#[test]
#[should_panic(expected = "Contract already initialized")]
fn test_double_initialization() {
    let env = Env::default();
    let contract_id = env.register(CredoraContract, ());
    let client = CredoraContractClient::new(&env, &contract_id);

    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);

    client.init(&admin1);
    client.init(&admin2);
}

#[test]
#[should_panic(expected = "Only administrator can add issuers")]
fn test_unauthorized_issuer_addition() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(CredoraContract, ());
    let client = CredoraContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let non_admin = Address::generate(&env);
    let new_issuer = Address::generate(&env);

    client.init(&admin);
    
    // Call add_issuer as non-admin, should panic
    client.add_issuer(&non_admin, &new_issuer, &String::from_str(&env, "Failure College"));
}

#[test]
#[should_panic(expected = "Address is not an authorized certificate issuer")]
fn test_unauthorized_issuance() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(CredoraContract, ());
    let client = CredoraContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let unauthorized_issuer = Address::generate(&env);
    let student = Address::generate(&env);

    client.init(&admin);

    let cert_id = String::from_str(&env, "CERT-002");
    let doc_hash = BytesN::from_array(&env, &[1u8; 32]);
    let metadata = String::from_str(&env, "Metadata");

    // Attempt to issue, should panic since unauthorized_issuer is not registered
    client.issue_certificate(&unauthorized_issuer, &cert_id, &student, &doc_hash, &metadata);
}

#[test]
fn test_remove_issuer() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(CredoraContract, ());
    let client = CredoraContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let issuer = Address::generate(&env);

    client.init(&admin);
    client.add_issuer(&admin, &issuer, &String::from_str(&env, "Temp Academy"));
    assert!(client.is_issuer(&issuer));

    client.remove_issuer(&admin, &issuer);
    assert!(!client.is_issuer(&issuer));
}
