const crypto = require('crypto');

// --- HELPER: Simulate Cryptographic Data ---
// 2048-bit RSA variables = 256 bytes
const generateRSA2048String = () => crypto.randomBytes(256).toString('base64');
// Ed25519 Signatures = 64 bytes
const generateEd25519Signature = () => crypto.randomBytes(64).toString('base64');
// DIDs are typically around 50 characters
const mockIssuerDID = "did:key:z6MkgEKa1d5JECUMbaDJqzhwXoU5pj1eEWN7Pp44E47kFNJk";
const mockPatientDID = "did:key:z6Mkf1...[patient_did]...xyz";

const CURRENT_EPOCH = 12;

// ==========================================
// 1. SIMULATE THE FTR (Ministry's Global List)
// ==========================================
const ftrSnapshot = {
    epoch: CURRENT_EPOCH,
    global_root: generateRSA2048String(),
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h TTL
    signature: generateEd25519Signature()
};

const ftrString = JSON.stringify(ftrSnapshot);
const ftrBytes = Buffer.byteLength(ftrString, 'utf8');


// ==========================================
// 2. SIMULATE THE VC (Patient's Prescription)
// ==========================================
const verifiableCredential = {
    "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://schema.org"
    ],
    type: ["VerifiableCredential", "PrescriptionCredential"],
    issuer: mockIssuerDID,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
        id: mockPatientDID,
        prescription: {
            medication: "Test Medicine 3",
            instructions: "Take as directed"
        }
    },
    // The Stateless Trust Extension
    credentialStatus: {
        type: "RSAAccumulatorWitness2026",
        epoch: CURRENT_EPOCH,
        hospital_prime: 65537, // Example prime P
        witness: generateRSA2048String() // W
    },
    proof: {
        type: "Ed25519Signature2018",
        created: new Date().toISOString(),
        verificationMethod: `${mockIssuerDID}#keys-1`,
        proofPurpose: "assertionMethod",
        jws: generateEd25519Signature()
    }
};

const vcString = JSON.stringify(verifiableCredential);
const vcBytes = Buffer.byteLength(vcString, 'utf8');


// ==========================================
// 3. OUTPUT RESULTS
// ==========================================
console.log("=== FTR SNAPSHOT (Pharmacy Download) ===");
console.log(`Exact Size: ${ftrBytes} bytes`);
console.log(`KB Size:    ${(ftrBytes / 1024).toFixed(2)} KB\n`);

console.log("=== VERIFIABLE CREDENTIAL (Patient Storage) ===");
console.log(`Exact Size: ${vcBytes} bytes`);
console.log(`KB Size:    ${(vcBytes / 1024).toFixed(2)} KB\n`);