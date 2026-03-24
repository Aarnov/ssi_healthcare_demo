// pharmacy-server/crypto/rsa-verifier.js

/**
 * Highly efficient Modular Exponentiation for BigInts
 * Calculates: (base ^ exponent) % modulus
 */
function modPow(base, exponent, modulus) {
    let result = 1n; // 'n' denotes a BigInt in JavaScript
    base = base % modulus;
    
    while (exponent > 0n) {
        // If the exponent is odd, multiply the base with the result
        if (exponent % 2n === 1n) {
            result = (result * base) % modulus;
        }
        // Square the base and halve the exponent
        exponent = exponent / 2n;
        base = (base * base) % modulus;
    }
    return result;
}

/**
 * Gate 2 Verification: Offline RSA Accumulator Math
 * Executes: W^P mod N == R
 */
function verifyGate2(scannedWitness, hospitalPrime, currentGlobalRoot, publicModulusN) {
    try {
        // 1. Convert everything to BigInt. 
        // Standard JS numbers will corrupt the 2048-bit math.
        const W = BigInt(scannedWitness);
        const P = BigInt(hospitalPrime);
        const N = BigInt(publicModulusN);
        const R = BigInt(currentGlobalRoot);

        // 2. Run the math puzzle: W^P mod N
        const calculatedRoot = modPow(W, P, N);
        
        // 3. Check if the mathematical result matches the Ministry's Root
        return calculatedRoot === R;
        
    } catch (error) {
        console.error("Math Engine Error: Invalid BigInt conversion.", error);
        return false;
    }
}

// Export the function so your index.js can import it
module.exports = { verifyGate2 };