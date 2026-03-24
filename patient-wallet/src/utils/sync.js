// src/utils/sync.js

// 🚨 UPDATE THIS IF YOUR WI-FI IP CHANGES
const MINISTRY_API_URL = "http://10.3.66.20:3000/api/deltas"; 
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

        const minEpoch = Math.min(...savedCredentials.map(cred => cred.rsaProof?.epoch || 0));

        console.log(`🔄 Fetching Ministry Deltas since Epoch ${minEpoch}...`);
        const response = await fetch(`${MINISTRY_API_URL}?since=${minEpoch}`);
        if (!response.ok) throw new Error("Ministry unreachable");
        
        const data = await response.json(); 
        let needsSave = false;
        const revokedSet = new Set(data.revokedDIDs); 

        const updatedCredentials = savedCredentials.map(cred => {
            const issuerDID = cred.vc?.issuer?.id || cred.vc?.issuer;
            
            if (cred.status === "REVOKED") return cred;

            if (revokedSet.has(issuerDID)) {
                cred.status = "REVOKED";
                needsSave = true;
                console.log(`❌ Hospital ${issuerDID} was revoked. Flagging UI.`);
                return cred;
            }

            if (data.latestEpoch > (cred.rsaProof?.epoch || 0)) {
                // 1. Find the witness wherever it might be hiding
                let currentWitness = BigInt(cred.rsaProof?.witness || cred.rsa?.witness || cred.statelessWitness || "0");
                
                const relevantPrimes = data.addedPrimes.filter(p => p.epoch > (cred.rsaProof?.epoch || 0));

                if (relevantPrimes.length > 0) {
                    relevantPrimes.forEach(record => {
                        currentWitness = power(currentWitness, BigInt(record.prime), MODULUS_N);
                    });
                    console.log(`✅ Mathematical update applied. Jumped to Epoch ${data.latestEpoch}`);
                }

                // 2. FORCE CREATE the rsaProof object if it doesn't exist
                if (!cred.rsaProof) {
                    cred.rsaProof = {};
                }

                // 3. Save the new state where the UI expects it
                cred.rsaProof.witness = currentWitness.toString();
                cred.rsaProof.r = data.currentRoot;
                cred.rsaProof.epoch = data.latestEpoch;
                
                needsSave = true;
            }
            return cred;
        });

        return { updatedCredentials, needsSave };

    } catch (error) {
        console.warn("⚠️ Sync Failed (Offline).", error.message);
        return { updatedCredentials: savedCredentials, needsSave: false };
    }
};