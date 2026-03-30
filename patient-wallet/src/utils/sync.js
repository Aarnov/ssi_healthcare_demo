// src/utils/sync.js

const IP_ADDRESS = "10.9.175.124"; 
const MINISTRY_API_URL = `http://${IP_ADDRESS}:3000/api`;
const MODULUS_N = BigInt("10000000000000000000000000000011600000000000000000000000000002739");

/**
 * Extended Euclidean Algorithm to find modular inverse
 * Required for negative Bezout coefficients [cite: 89]
 */
const modInverse = (a, m) => {
    let m0 = m;
    let y = 0n, x = 1n;
    if (m === 1n) return 0n;
    while (a > 1n) {
        let q = a / m;
        let t = m;
        m = a % m;
        a = t;
        t = y;
        y = x - q * y;
        x = t;
    }
    if (x < 0n) x += m0;
    return x;
};

/**
 * Enhanced Power function that handles negative exponents
 * via modular multiplicative inverse [cite: 92]
 */
const power = (base, exp, mod) => {
    let b = BigInt(base) % mod;
    let e = BigInt(exp);
    
    // If exponent is negative, find inverse of base and make exponent positive
    if (e < 0n) {
        b = modInverse(b, mod);
        e = -e;
    }

    let res = 1n;
    while (e > 0n) {
        if (e % 2n === 1n) res = (res * b) % mod;
        b = (b * b) % mod;
        e = e / 2n;
    }
    return res;
};

export const syncWalletWithMinistry = async (savedCredentials) => {
    try {
        if (!savedCredentials || savedCredentials.length === 0) {
            return { updatedCredentials: [], needsSave: false };
        }

        const minEpoch = Math.min(...savedCredentials.map(cred => cred.rsaProof?.epoch ?? cred.epoch ?? 0));
        
        const response = await fetch(`${MINISTRY_API_URL}/deltas?since=${minEpoch}`);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const data = await response.json(); 
        const currentRoot = BigInt(data.currentRoot);
        let needsSave = false;

        const updatedCredentials = await Promise.all(savedCredentials.map(async (cred) => {
            try {
                const issuerDID = cred.vc?.issuer?.id || cred.vc?.issuer;
                const myPrime = BigInt(cred.rsaProof?.prime || cred.rsa?.prime || cred.hospitalPrime || cred.statelessPrime || "0");
                
                if (cred.status === "REVOKED") return cred;

                // --- A. REVOCATION CHECK ---
                if (data.revokedDIDs && data.revokedDIDs.includes(issuerDID)) {
                    cred.status = "REVOKED";
                    needsSave = true;
                    return cred;
                }

                const currentCredEpoch = cred.rsaProof?.epoch ?? cred.epoch ?? 0;

                if (data.latestEpoch > currentCredEpoch) {
                    if (myPrime === 0n) return cred;

                    let currentWitness = BigInt(cred.rsaProof?.witness || cred.rsa?.witness || cred.statelessWitness || "0");
                    
                    // --- B. STANDARD FAST-FORWARD (Additions) ---
                    const newPrimes = data.addedPrimes.filter(p => p.epoch > currentCredEpoch);
                    if (newPrimes.length > 0) {
                        newPrimes.forEach(record => {
                            if (BigInt(record.prime) !== myPrime) {
                                currentWitness = power(currentWitness, BigInt(record.prime), MODULUS_N);
                            }
                        });
                    }

                    // --- C. BEZOUT DEFENSE (Revocations) [cite: 86-93] ---
                    // If revocations occurred, standard multiplication won't reach the root.
                    // We must apply the Bezout Identity: W_new = (W_old^b * R_new^a) mod N
                    if (data.revokedPrimes && data.revokedPrimes.length > 0) {
                        try {
                            const bResp = await fetch(`${MINISTRY_API_URL}/innocence-proof?prime=${myPrime}`);
                            const bData = await bResp.json();
                            
                            if (bData.a && bData.b) {
                                const a = BigInt(bData.a);
                                const b = BigInt(bData.b);

                                // W_new = (W_old^b) * (R_new^a) mod N [cite: 92]
                                const term1 = power(currentWitness, b, MODULUS_N);
                                const term2 = power(currentRoot, a, MODULUS_N);
                                
                                currentWitness = (term1 * term2) % MODULUS_N;

                                if (!cred.rsaProof) cred.rsaProof = {};
                                cred.rsaProof.bezout = { a: bData.a, b: bData.b };
                            }
                        } catch (e) {
                            console.error("Bezout update failed", e);
                        }
                    }

                    // --- D. COMMIT UPDATES ---
                    if (!cred.rsaProof) cred.rsaProof = {};
                    cred.rsaProof.prime = myPrime.toString();
                    cred.rsaProof.witness = currentWitness.toString();
                    cred.rsaProof.r = data.currentRoot;
                    cred.rsaProof.epoch = data.latestEpoch;
                    
                    needsSave = true;
                }
                return cred;

            } catch (innerError) {
                console.error("Math processing error", innerError);
                return cred;
            }
        }));

        return { updatedCredentials, needsSave };

    } catch (error) {
        console.error("Sync error", error);
        return { updatedCredentials: savedCredentials, needsSave: false };
    }
};