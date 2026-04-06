# Ledger-Less Self-Sovereign Identity in Healthcare 🏥🔐

A stateless, blockchain-free Federated Trust Architecture designed to solve the conflict between decentralized healthcare identity and GDPR Right-to-Erasure mandates.

## 🏆 What We Achieved (Project Highlights)
Traditional Self-Sovereign Identity (SSI) frameworks rely on global blockchains for trust and revocation. However, the immutable nature of distributed ledgers fundamentally conflicts with healthcare privacy regulations, while introducing network latency and high transaction costs. 

Through this project, we successfully engineered and proved a **Stateless Algorithmic Verification** model that achieves the following:
* **Ledger-Less & GDPR Compliant:** No Personally Identifiable Information (PII) is ever anchored to a permanent global ledger, natively supporting the Right to Erasure.
* **O(1) Edge Payload:** The verification state remains a constant ~0.6 KB, regardless of how many hospitals are globally revoked.
* **Sub-Millisecond Offline Finality:** Rural or unconnected pharmacies can mathematically verify a credential locally in ~0.11 ms, entirely bypassing the 150ms+ network latency of traditional APIs.
* **Optimized Bézout Recovery:** Heavy cryptographic computation (Extended Euclidean Algorithm) is offloaded to the central Ministry server during background syncs, allowing low-power mobile edge devices to perform simple $O(1)$ math to update their stateless witnesses.

---

## 🏗️ System Architecture
The codebase is divided into three primary operational nodes:
1. **Ministry Server (Backend):** Manages the RSA trapdoor, calculates Bézout coefficients, and pushes the global root to IPFS.
2. **Patient Wallet (Mobile):** Stores the Verifiable Credential, syncs mathematically updated witnesses, and generates the offline QR code.
3. **Pharmacy Terminal (Edge Node):** Fully offline verifier that authenticates the Ed25519 signature and executes the local Bézout identity check (`aP_valid + bP_revoked = 1`).

---

## 🚀 How to Run the Project

### Prerequisites
Before running the system, ensure you have the following installed on your machine:
* **Node.js** (v20 or higher)
* **npm** or **yarn**
* **Expo CLI** (for the React Native mobile wallet)

### Step 1: Start the Ministry Server
This server acts as the governance authority, handling prime generation and the `/api/innocence-proof` endpoint.
1. Open a terminal and navigate to the server directory:
   `cd ministry-server`
2. Install dependencies:
   `npm install`
3. Start the server:
   `npm run start` (or `node server.js`)
*Note: Ensure the server is running on localhost (default usually port 3000 or 8080).*

### Step 2: Start the Patient Wallet App
This is the React Native application that stores the credential and syncs with the Ministry.
1. Open a new terminal window and navigate to the wallet directory:
   `cd patient-wallet`
2. Install dependencies:
   `npm install`
3. Start the Expo development server:
   `npx expo start`
4. Use the Expo Go app on your physical phone (or an iOS/Android emulator on your computer) to scan the QR code and launch the wallet.

### Step 3: Run the Pharmacy Terminal Verification
To simulate an offline pharmacy scanning the patient's QR code and verifying the math locally:
1. Open a third terminal window and navigate to the pharmacy script directory:
   `cd pharmacy-terminal`
2. Install any required dependencies:
   `npm install`
3. Execute the verification script (simulating a QR scan):
   `node verify.js` 
*(This will output the local verification logs, culminating in the "VERDICT: DISPENSE APPROVED" state).*

---
**License:** MIT License
**Research Publication:** This codebase serves as the practical implementation of the architectural theories proposed in our paper regarding RSA Accumulators and Stateless Federated Trust.