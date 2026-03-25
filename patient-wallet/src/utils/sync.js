// src/utils/sync.js

const IP_ADDRESS = "10.3.66.20"; 
const MINISTRY_API_URL = `http://${IP_ADDRESS}:3000/api`;
const MODULUS_N = "10000000000000000000000000000011600000000000000000000000000002739";

const power = (base, exp, mod) => {
    let res = 1n;
    base = BigInt(base) % BigInt(mod);
    exp = BigInt(exp);
    let n = BigInt(mod);
    while (exp > 0n) {
        if (exp % 2n === 1n) res = (res * base) % n;
        base = (base * base) % n;
        exp = exp / 2n;
    }
    return res;
};

export const syncWalletWithMinistry = async (savedCredentials) => {
    try {
        if (!savedCredentials || savedCredentials.length === 0) {
            return { updatedCredentials: [], needsSave: false };
        }

        // Extract the exact epoch for the network request
        const minEpoch = Math.min(...savedCredentials.map(cred => cred.rsaProof?.epoch ?? cred.epoch ?? 0));
        
        const response = await fetch(`${MINISTRY_API_URL}/deltas?since=${minEpoch}`);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const data = await response.json(); 
        let needsSave = false;

        const updatedCredentials = await Promise.all(savedCredentials.map(async (cred) => {
            try {
                const issuerDID = cred.vc?.issuer?.id || cred.vc?.issuer;
                const myPrime = cred.rsaProof?.prime || cred.rsa?.prime || cred.hospitalPrime || cred.statelessPrime;
                
                if (cred.status === "REVOKED") return cred;

                // --- A. IS MY HOSPITAL DEAD? ---
                if (data.revokedDIDs && data.revokedDIDs.includes(issuerDID)) {
                    cred.status = "REVOKED";
                    needsSave = true;
                    return cred;
                }

                // --- B. IS MY MATH STALE? ---
                // 🚨 FIXED: Capture the exact starting epoch to prevent the "Burnt Cake" double-dip
                const currentCredEpoch = cred.rsaProof?.epoch ?? cred.epoch ?? 0;

                if (data.latestEpoch > currentCredEpoch) {
                    
                    if (!myPrime) {
                        alert(`CRASH PREVENTED: Missing Prime for hospital ${issuerDID}`);
                        return cred; 
                    }

                    let currentWitness = BigInt(cred.rsaProof?.witness || cred.rsa?.witness || cred.statelessWitness || "0");
                    
                    const isAlreadyValid = power(currentWitness, BigInt(myPrime), MODULUS_N) === BigInt(data.currentRoot);

                    if (!isAlreadyValid) {
                        // 🚨 FIXED: Only filter primes added AFTER this credential's specific epoch
                        const newPrimes = data.addedPrimes.filter(p => p.epoch > currentCredEpoch);
                        if (newPrimes.length > 0) {
                            newPrimes.forEach(record => {
                                if (String(record.prime) !== String(myPrime)) {
                                    currentWitness = power(currentWitness, BigInt(record.prime), MODULUS_N);
                                }
                            });
                        }
                    }

                    // 🛡️ TIER 3: THE BÉZOUT FETCH
                    if (data.revokedPrimes && data.revokedPrimes.length > 0) {
                        try {
                            const bResp = await fetch(`${MINISTRY_API_URL}/innocence-proof?prime=${myPrime}`);
                            const bData = await bResp.json();
                            if (bData.a) {
                                if (!cred.rsaProof) cred.rsaProof = {};
                                cred.rsaProof.bezout = { a: bData.a, b: bData.b };
                            }
                        } catch (e) {
                            // Silently fail Bezout if network drops
                        }
                    }

                    if (!cred.rsaProof) cred.rsaProof = {};

                    cred.rsaProof.prime = myPrime.toString();
                    cred.rsaProof.witness = currentWitness.toString();
                    cred.rsaProof.r = data.currentRoot;
                    cred.rsaProof.epoch = data.latestEpoch;
                    
                    needsSave = true;
                }
                return cred;

            } catch (innerError) {
                alert("MATH CRASH: " + innerError.message);
                return cred;
            }
        }));

        return { updatedCredentials, needsSave };

    } catch (error) {
        alert("SYNC CRASH: " + error.message);
        return { updatedCredentials: savedCredentials, needsSave: false };
    }
};