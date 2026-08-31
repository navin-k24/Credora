# Credora - Decentralized Certificate Issuance & Verification Platform

> **Level 4 - Green Belt Submission**  
> **Built on Stellar with Soroban Smart Contracts**

Credora is a production-ready, decentralized credential registry built on the Stellar network. It enables accredited educational institutions, universities, and independent instructors to issue tamper-resistant digital certificates directly on-chain. Using client-side cryptographic document hashing (SHA-256), employers, students, and verifiers can confirm the authenticity and validity of credentials in seconds without exposing confidential student records on the public ledger.

---

## 🌟 Key Features

- **Tamper-Resistant On-Chain Verification**: Stores cryptographic SHA-256 fingerprints of certificates on Soroban persistent storage. Even a 1-byte alteration of a PDF invalidates the certificate instantly.
- **Privacy-Preserving (Zero Private Data on Ledger)**: Student names, grades, and metadata are hashed locally; only authorization signatures and cryptographic proofs reside on-chain.
- **Role-Based Governance**: Multi-tier architecture ensuring only admin-authorized institutions can mint valid credentials.
- **Instant Revocation Mechanism**: Issuing authorities can revoke compromised or errant certificates with immediate global reflection.
- **Universal Accessibility (Freighter + Dev Mock Mode)**: Seamlessly integrates with the official **Freighter Wallet** or zero-setup **Developer Mock Wallet** (auto-funded by Stellar Friendbot) for rapid testing.
- **Mobile Responsive & Accessible UI**: Polished dark-mode user interface with real-time feedback, loading states, and error handling.

---

## 🏛️ Smart Contract Architecture (`contracts/credora_contract`)

The Soroban smart contract is written in Rust and implements the following interface:

### Administrative & Governance
- `init(admin: Address)`: Initializes contract ownership.
- `get_admin() -> Option<Address>`: Retrieves the contract admin address.
- `add_issuer(admin: Address, issuer: Address, name: String)`: Authorizes a new educational institution.
- `remove_issuer(admin: Address, issuer: Address)`: Deauthorizes an institution from issuing future certificates.
- `is_issuer(address: Address) -> bool`: Checks authorization status of an address.
- `get_issuer_info(address: Address) -> Option<IssuerInfo>`: Retrieves institution name and registration timestamp.

### Certificate Operations
- `issue_certificate(issuer: Address, id: String, recipient: Address, doc_hash: BytesN<32>, metadata: String)`: Registers a new certificate.
- `revoke_certificate(issuer: Address, id: String)`: Revokes a certificate (authorized only by the original issuing address).
- `get_certificate(id: String) -> Option<Certificate>`: Fetches full certificate record.
- `verify_certificate(id: String, doc_hash: BytesN<32>) -> bool`: Validates if a certificate is active and matches the document hash.

---

## 💻 Tech Stack

- **Blockchain**: Stellar Network (Soroban Smart Contracts v27)
- **Contract Language**: Rust (`wasm32-unknown-unknown`)
- **Frontend Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS (Stellar Dark Theme)
- **Client Libraries**: `@stellar/stellar-sdk`, `@stellar/freighter-api`, `lucide-react`
- **Crypto Engine**: Web Crypto API (`crypto.subtle.digest('SHA-256')`)

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust & Cargo](https://rustup.rs/) (v1.75+) with `wasm32-unknown-unknown` target
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/install)

### 2. Smart Contract Testing & Compilation
```bash
# Run unit tests
cargo test

# Build optimized WASM binary
stellar contract build
```

### 3. Smart Contract Deployment (Stellar Testnet)
```bash
# Generate/load a testnet identity
stellar keys generate alice --network testnet
stellar keys fund alice --network testnet

# Deploy the contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/credora_contract.wasm \
  --source alice \
  --network testnet
```

### 4. Running the Frontend
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🛡️ Verification & Security Design

1. **Document Integrity**: Hashing is performed entirely in the user's browser using `crypto.subtle.digest('SHA-256')`. The raw document never leaves the client machine.
2. **Access Control**: Every state-modifying action requires cryptographic transaction signing via `require_auth()` in Soroban.
3. **Immutability with Controlled Revocation**: Once issued, certificate contents cannot be modified; issuers can only set the revocation flag if an error or infraction occurred.

---

## 👥 Onboarding & Validation

See [onboarding.md](./onboarding.md) for proof of 10+ user wallet interactions, testnet transactions, and real-world feedback summaries.
