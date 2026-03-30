// benchmark_v2.js
const crypto = require('crypto');
const { performance } = require('perf_hooks');

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

const TOTAL_RUNS = 5000;
const MODULUS_N = BigInt("10000000000000000000000000000011600000000000000000000000000002739");

// Mock Data
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const payload = Buffer.from('benchmarking_payload');
const sig = crypto.sign(null, payload, privateKey);

const metrics = { gate1: [], gate2: [], gate3: [] };

for (let i = 0; i < TOTAL_RUNS; i++) {
    // GATE 1: Signature
    let s1 = performance.now();
    crypto.verify(null, payload, publicKey, sig);
    metrics.gate1.push(performance.now() - s1);

    // GATE 2: Standard Witness (1 Exp)
    let s2 = performance.now();
    modPow(2n, 15n, MODULUS_N);
    metrics.gate2.push(performance.now() - s2);

    // GATE 3: Bezout Defense (2 Exps + 1 Mult)
    let s3 = performance.now();
    let part1 = modPow(2n, 12345n, MODULUS_N); // W^b
    let part2 = modPow(32768n, 6789n, MODULUS_N); // R^a
    let final = (part1 * part2) % MODULUS_N;
    metrics.gate3.push(performance.now() - s3);
}

const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

console.log(`📊 --- DETAILED PROTOTYPE BENCHMARKS (${TOTAL_RUNS} runs) ---`);
console.log(`1️⃣ Gate 1 (Ed25519): ${avg(metrics.gate1).toFixed(4)} ms`);
console.log(`2️⃣ Gate 2 (Standard): ${avg(metrics.gate2).toFixed(4)} ms`);
console.log(`3️⃣ Gate 3 (Bézout):   ${avg(metrics.gate3).toFixed(4)} ms`);

console.log(`\n🚀 NORMAL PATH TOTAL:     ${(avg(metrics.gate1) + avg(metrics.gate2)).toFixed(4)} ms`);
console.log(`🛡️  REVOCATION PATH TOTAL: ${(avg(metrics.gate1) + avg(metrics.gate3)).toFixed(4)} ms`);