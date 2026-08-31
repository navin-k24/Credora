#![no_std]
use core::option::Option;
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env, String
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Certificate {
    pub id: String,
    pub issuer: Address,
    pub recipient: Address,
    pub doc_hash: BytesN<32>,
    pub metadata: String,
    pub issue_date: u64,
    pub revoked: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssuerInfo {
    pub name: String,
    pub authorized_at: u64,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Issuer(Address),
    Certificate(String),
}

#[contract]
pub struct CredoraContract;

#[contractimpl]
impl CredoraContract {
    /// Initialize the contract with an administrator address.
    pub fn init(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Contract already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        
        // Publish initialization event
        env.events().publish(
            (symbol_short!("init"),),
            admin
        );
    }

    /// Retrieve the current administrator address.
    pub fn get_admin(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::Admin)
    }

    /// Authorize a new educational institution or instructor as an issuer.
    pub fn add_issuer(env: Env, admin: Address, issuer: Address, name: String) {
        admin.require_auth();
        
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin)
            .expect("Contract not initialized");
        if admin != stored_admin {
            panic!("Only administrator can add issuers");
        }

        let info = IssuerInfo {
            name: name.clone(),
            authorized_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&DataKey::Issuer(issuer.clone()), &info);

        // Publish event
        env.events().publish(
            (symbol_short!("add_iss"), issuer.clone()),
            name
        );
    }

    /// Revoke the authorization of an issuer.
    pub fn remove_issuer(env: Env, admin: Address, issuer: Address) {
        admin.require_auth();
        
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin)
            .expect("Contract not initialized");
        if admin != stored_admin {
            panic!("Only administrator can remove issuers");
        }

        if !env.storage().persistent().has(&DataKey::Issuer(issuer.clone())) {
            panic!("Issuer not found");
        }

        env.storage().persistent().remove(&DataKey::Issuer(issuer.clone()));

        // Publish event
        env.events().publish(
            (symbol_short!("rem_iss"), issuer.clone()),
            ()
        );
    }

    /// Check if an address is an authorized issuer.
    pub fn is_issuer(env: Env, address: Address) -> bool {
        env.storage().persistent().has(&DataKey::Issuer(address))
    }

    /// Retrieve the information of an authorized issuer.
    pub fn get_issuer_info(env: Env, address: Address) -> Option<IssuerInfo> {
        env.storage().persistent().get(&DataKey::Issuer(address))
    }

    /// Issue a new certificate.
    pub fn issue_certificate(
        env: Env,
        issuer: Address,
        id: String,
        recipient: Address,
        doc_hash: BytesN<32>,
        metadata: String,
    ) {
        issuer.require_auth();

        // Verify issuer is authorized
        if !env.storage().persistent().has(&DataKey::Issuer(issuer.clone())) {
            panic!("Address is not an authorized certificate issuer");
        }

        let cert_key = DataKey::Certificate(id.clone());
        if env.storage().persistent().has(&cert_key) {
            panic!("Certificate ID already exists");
        }

        let certificate = Certificate {
            id: id.clone(),
            issuer: issuer.clone(),
            recipient: recipient.clone(),
            doc_hash: doc_hash.clone(),
            metadata: metadata.clone(),
            issue_date: env.ledger().timestamp(),
            revoked: false,
        };

        env.storage().persistent().set(&cert_key, &certificate);

        // Publish certificate issuance event
        env.events().publish(
            (symbol_short!("issue"), id, issuer, recipient),
            doc_hash
        );
    }

    /// Revoke a certificate. Can only be done by the original issuer.
    pub fn revoke_certificate(env: Env, issuer: Address, id: String) {
        issuer.require_auth();

        let cert_key = DataKey::Certificate(id.clone());
        let mut certificate: Certificate = env.storage().persistent().get(&cert_key)
            .expect("Certificate not found");

        if certificate.issuer != issuer {
            panic!("Only the original issuer can revoke this certificate");
        }

        if certificate.revoked {
            panic!("Certificate is already revoked");
        }

        certificate.revoked = true;
        env.storage().persistent().set(&cert_key, &certificate);

        // Publish revocation event
        env.events().publish(
            (symbol_short!("revoke"), id),
            issuer
        );
    }

    /// Retrieve full details of a certificate.
    pub fn get_certificate(env: Env, id: String) -> Option<Certificate> {
        env.storage().persistent().get(&DataKey::Certificate(id))
    }

    pub fn verify_certificate(env: Env, id: String, doc_hash: BytesN<32>) -> bool {
        let cert_key = DataKey::Certificate(id);
        if let Some(cert) = env.storage().persistent().get::<DataKey, Certificate>(&cert_key) {
            !cert.revoked && cert.doc_hash == doc_hash
        } else {
            false
        }
    }
}

#[cfg(test)]
mod test;
