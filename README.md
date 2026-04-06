# Ledger-Less Self-Sovereign Identity in Healthcare 🏥🔐

A stateless, blockchain-free Federated Trust Architecture designed to solve the conflict between decentralized healthcare identity and GDPR Right-to-Erasure mandates.

## 🏆 What We Achieved
Traditional Self-Sovereign Identity (SSI) frameworks rely on global blockchains for trust and revocation. However, the immutable nature of distributed ledgers fundamentally conflicts with healthcare privacy regulations, while introducing network latency and high transaction costs. 

Through this project, we successfully engineered and proved a **Stateless Algorithmic Verification** model that achieves the following:
* **Ledger-Less & GDPR Compliant:** No Personally Identifiable Information (PII) is ever anchored to a permanent global ledger, natively supporting the Right to Erasure.
* **O(1) Edge Payload:** The verification state remains a constant ~0.6 KB, regardless of how many hospitals are globally revoked.
* **Sub-Millisecond Offline Finality:** Rural or unconnected pharmacies can mathematically verify a credential locally in ~0.11 ms, entirely bypassing the 150ms+ network latency of traditional APIs.
* **Optimized Bézout Recovery:** Heavy cryptographic computation (Extended Euclidean Algorithm) is offloaded to the central Ministry server during background syncs, allowing low-power edge devices to perform simple $O(1)$ math to update their stateless witnesses.

---

## 🏗️ Distributed System Architecture
To accurately simulate a decentralized healthcare network, this project is implemented as a distributed ecosystem consisting of multiple distinct servers:

1. **Ministry Server:** The central governance authority. Manages the RSA trapdoor, registers/revokes hospitals, pushes the global root to IPFS, and exposes the `/api/innocence-proof` endpoint.
2. **Hospital Server(s):** Registered by the Ministry. Acts as the issuer. Generates the W3C Verifiable Credential (prescription) for the patient.
3. **Patient Web Wallet:** A web-based application where the patient scans and stores their VC. It syncs mathematically updated witnesses via the Ministry API and generates the final QR code.
4. **Pharmacy Server/Terminal:** The verifier node. Scans the patient's prescription QR code and executes the Dual-Gate verification locally (`aP_valid + bP_revoked = 1`).

---

## 🔄 The Clinical Workflow
Our ecosystem strictly follows this real-world operational flow:
1. **Registration:** The Ministry server registers a Hospital, assigning it a strictly coprime identifier, or revokes it if necessary.
2. **Issuance:** The Hospital server issues a Verifiable Credential (VC) prescription for a patient.
3. **Storage & Sync:** The Patient scans the VC into their Web Wallet. The wallet pings the Ministry server to fetch the latest Bézout coefficients and generates a dispensation QR code.
4. **Verification:** The Patient shows the QR code to the Pharmacy. The Pharmacy scans it and instantly verifies the Ed25519 signature and the hospital's revocation status offline.

---

## 🚀 How to Run the Ecosystem

Because this is a distributed architecture, you will need to open multiple terminal windows to spin up the respective servers (typically running on different local ports like 3000, 3001, 3002, etc.).

### Step 1: Initialize the Ministry Server
1. Navigate to the Ministry directory.
2. Install dependencies (`npm install`).
3. Start the server. This initializes the RSA Accumulator, creates the Trust Registry, and begins listening for wallet syncs and hospital registrations.

### Step 2: Spin up the Hospital Server
1. Navigate to the Hospital directory in a new terminal.
2. Install dependencies and start the server.
3. Use the hospital's interface/endpoints to register with the Ministry and issue a new prescription VC to a patient.

### Step 3: Launch the Patient Web Wallet
1. Navigate to the Patient Wallet directory in a third terminal.
2. Install dependencies and start the web application.
3. Open the wallet in your browser. Use it to scan/import the VC issued by the Hospital in Step 2.

### Step 4: Start the Pharmacy Terminal
1. Navigate to the Pharmacy directory in a fourth terminal.
2. Install dependencies and start the pharmacy verification server/interface.
3. Simulate the final step by scanning the patient's wallet QR code using the Pharmacy terminal to see the sub-millisecond local math verification in action.

---
**License:** MIT License
**Research Publication:** This codebase serves as the practical implementation of the architectural theories proposed in our paper regarding RSA Accumulators and Stateless Federated Trust.