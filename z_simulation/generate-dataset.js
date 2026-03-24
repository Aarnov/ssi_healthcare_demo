const crypto = require('crypto');
const fs = require('fs');

const TOTAL_PRESCRIPTIONS = 5000;
const OUTPUT_FILE = 'dataset.json';

// --- RSA Accumulator Math Helper ---
function modPow(base, exponent, modulus) {
    if (modulus === 1n) return 0n;
    let result = 1n;
    base = base % modulus;
    while (exponent > 0n) {
        if (exponent % 2n === 1n) result = (result * base) % modulus;
        exponent = exponent >> 1n;
        base = (base * base) % modulus;
    }
    return result;
}

// --- Cryptographic Setup ---
const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
const MODULUS_HEX = crypto.randomBytes(256).toString('hex');
const N = BigInt('0x' + MODULUS_HEX);
const P = BigInt(65537); // Standard prime

// --- The "Agent" Seed Data (Highly Variable Real-World Prescriptions) ---
const medicalSeeds = [
    { med: "Aspirin 81mg", inst: "1 tablet daily." },
    { med: "Amoxicillin 500mg", inst: "Take 1 capsule by mouth three times a day for 10 days. Finish all medication." },
    { med: "Lisinopril 20mg", inst: "Take 1 tablet daily in the morning for blood pressure." },
    { med: "Metformin 1000mg", inst: "Take 1 tablet twice daily with meals." },
    { med: "Albuterol HFA Inhaler 90mcg/actuation", inst: "Inhale 2 puffs every 4 to 6 hours as needed for shortness of breath. Shake well." },
    { med: "Atorvastatin 40mg", inst: "Take 1 tablet daily at bedtime." },
    { med: "Sertraline 50mg", inst: "Take 1 tablet daily. May cause drowsiness." },
    { med: "Omeprazole 20mg", inst: "Take 1 capsule daily before breakfast." },
    { med: "Gabapentin 300mg", inst: "Take 1 capsule by mouth three times a day. Do not stop abruptly." },
    { med: "Levothyroxine 75mcg", inst: "Take 1 tablet daily on an empty stomach, 30 minutes before eating." },
    { med: "Pediatric Liquid Ibuprofen 100mg/5mL", inst: "Give 5mL by mouth every 6 hours as needed for fever. Do not exceed 4 doses in 24 hours." },
    { med: "Insulin Glargine 100 units/mL", inst: "Inject 20 units subcutaneously once daily at bedtime." }
];

console.log(`🏥 Booting Hospital Issuance Simulator...`);
console.log(`Generating ${TOTAL_PRESCRIPTIONS} unique prescriptions. This will take a few seconds...\n`);

const dataset = {
    metadata: {
        total: TOTAL_PRESCRIPTIONS,
        generatedAt: new Date().toISOString(),
        modulusN: MODULUS_HEX // We save the modulus so the verifier can use the exact same one
    },
    prescriptions: []
};

for (let i = 0; i < TOTAL_PRESCRIPTIONS; i++) {
    // 1. Pick a random prescription seed
    const seed = medicalSeeds[Math.floor(Math.random() * medicalSeeds.length)];
    
    // 2. Generate Realistic DIDs and Timestamps
    const patientDID = `did:key:z6Mk${crypto.randomBytes(16).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 36)}`;
    const hospitalDID = `did:key:z6MkHospitalNodeAuth${crypto.randomBytes(4).toString('hex')}`;
    
    // Spread the issuance times randomly over the last 24 hours
    const issuanceTime = new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString(); 

    // 3. Construct the Verifiable Credential Payload
    const vcPayload = JSON.stringify({
        credentialSubject: {
            type: "MedicalPrescription",
            medicine: seed.med,
            instructions: seed.inst,
            id: patientDID
        },
        issuer: { id: hospitalDID },
        type: ["VerifiableCredential"],
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        issuanceDate: issuanceTime
    });

    // 4. Gate 1: Sign the VC (ECDSA)
    const sign = crypto.createSign('SHA256');
    sign.update(vcPayload);
    sign.end();
    const signature = sign.sign(privateKey, 'base64');

    // 5. Gate 2: Calculate RSA Proof Math
    const W_Hex = crypto.randomBytes(256).toString('hex');
    const W = BigInt('0x' + W_Hex);
    const R = modPow(W, P, N); // R = W^P mod N

    // 6. Push to Dataset Array
    dataset.prescriptions.push({
        vc: {
            payload: vcPayload,
            jwtSignature: signature,
            publicKey: publicKeyHex = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'der' }).toString('hex') // Save public key for the offline verifier to check against
        },
        rsaProof: {
            w: W.toString(16),
            p: P.toString(16),
            r: R.toString(16)
        }
    });

    // Progress logger
    if ((i + 1) % 1000 === 0) {
        console.log(`➡️ Generated ${i + 1} / ${TOTAL_PRESCRIPTIONS} records...`);
    }
}

// Write to Disk
console.log(`\n💾 Writing dataset to ${OUTPUT_FILE}...`);
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(dataset, null, 2));

const stats = fs.statSync(OUTPUT_FILE);
const fileSizeInMegabytes = (stats.size / (1024 * 1024)).toFixed(2);
console.log(`✅ Success! Generated ${fileSizeInMegabytes} MB of simulated hospital data.`);