const fs = require('fs');
const crypto = require('crypto');
const { performance } = require('perf_hooks');

const DATASET_FILE = 'dataset.json';

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

console.log("📥 Loading dataset into Pharmacy Memory...");
const rawData = fs.readFileSync(DATASET_FILE, 'utf8');
const dataset = JSON.parse(rawData);

const TOTAL_PRESCRIPTIONS = dataset.metadata.total;
const MODULUS_N = BigInt('0x' + dataset.metadata.modulusN);
const P = BigInt(65537); // Standard prime we used

console.log(`✅ Loaded ${TOTAL_PRESCRIPTIONS} prescriptions.`);
console.log("🚀 Starting Offline Dual-Gate Verification Benchmark...\n");

const metrics = {
    gate1Times: [],
    gate2Times: []
};

let successCount = 0;
let failCount = 0;

for (let i = 0; i < TOTAL_PRESCRIPTIONS; i++) {
    const record = dataset.prescriptions[i];
    
    // ==========================================
    // GATE 1: NATIVE JWT SIGNATURE CHECK
    // ==========================================
    const startGate1 = performance.now();
    
    // Reconstruct the public key from the hex saved in the dataset
    const pubKey = crypto.createPublicKey({
        key: Buffer.from(record.vc.publicKey, 'hex'),
        format: 'der',
        type: 'spki'
    });

    const verify = crypto.createVerify('SHA256');
    verify.update(record.vc.payload);
    verify.end();
    
    const isSigValid = verify.verify(pubKey, record.vc.jwtSignature, 'base64');
    const endGate1 = performance.now();

    if (!isSigValid) {
        failCount++;
        continue; // Skip Gate 2 if Gate 1 fails (mimicking your index.js logic)
    }
    metrics.gate1Times.push(endGate1 - startGate1);

    // ==========================================
    // GATE 2: RSA ACCUMULATOR MATH
    // ==========================================
    const startGate2 = performance.now();
    
    const checkW = BigInt('0x' + record.rsaProof.w);
    const checkR = BigInt('0x' + record.rsaProof.r);
    
    // The core math: Does W^P mod N === R?
    const calculatedR = modPow(checkW, P, MODULUS_N);
    const isMathValid = (calculatedR === checkR);
    
    const endGate2 = performance.now();

    if (isMathValid) {
        successCount++;
        metrics.gate2Times.push(endGate2 - startGate2);
    } else {
        failCount++;
    }
}

// --- Results Calculation ---
const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const max = (arr) => arr.length ? Math.max(...arr) : 0;
const min = (arr) => arr.length ? Math.min(...arr) : 0;

console.log("📊 --- PHARMACY VERIFICATION RESULTS ---");
console.log(`Total Prescriptions Scanned: ${TOTAL_PRESCRIPTIONS}`);
console.log(`✅ Passed Both Gates: ${successCount}`);
console.log(`❌ Failed: ${failCount}`);

console.log("\n1️⃣ Gate 1 Verification Time (ECDSA Signature Check):");
console.log(`   Average Time: ${avg(metrics.gate1Times).toFixed(3)} ms`);
console.log(`   Max Time:     ${max(metrics.gate1Times).toFixed(3)} ms`);
console.log(`   Min Time:     ${min(metrics.gate1Times).toFixed(3)} ms`);

console.log("\n2️⃣ Gate 2 Verification Time (2048-bit RSA Math Check):");
console.log(`   Average Time: ${avg(metrics.gate2Times).toFixed(3)} ms`);
console.log(`   Max Time:     ${max(metrics.gate2Times).toFixed(3)} ms`);
console.log(`   Min Time:     ${min(metrics.gate2Times).toFixed(3)} ms`);

console.log(`\n⚡ Total Average Processing Time per Prescription: ${(avg(metrics.gate1Times) + avg(metrics.gate2Times)).toFixed(3)} ms`);
console.log("----------------------------------------\n");