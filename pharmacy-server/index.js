const express = require('express');
const cors = require('cors');
const axios = require('axios'); 
const { verifyGate2 } = require('./crypto/rsa-verifier.js'); 

const { verifyCredential } = require('did-jwt-vc');
const { Resolver } = require('did-resolver');
const { getResolver: getWebResolver } = require('web-did-resolver');
const { getResolver: getKeyResolver } = require('key-did-resolver');

const app = express();
app.use(cors());
app.use(express.json());

const resolver = new Resolver({
    ...getWebResolver(),
    ...getKeyResolver()
});

// --- DYNAMIC FTR CACHE ---
const LOCAL_FTR_CACHE = {
    modulusN: "10000000000000000000000000000011600000000000000000000000000002739",
    currentRoot: "",     
    revokedProduct: 1n    // 🚨 TIER 3: The product of all revoked primes
};

// 🚨 If running pharmacy scanner on mobile, change localhost to your IP (10.3.66.20)
const MINISTRY_URL = "http://localhost:3000";

/**
 * 🔄 FTR SYNC ENGINE
 * Pulls the Ground Truth and Revoked Primes from the Ministry
 */
async function syncWithMinistry() {
    try {
        const response = await axios.get(`${MINISTRY_URL}/api/deltas?since=0`);
        LOCAL_FTR_CACHE.currentRoot = response.data.currentRoot;
        
        // Build the "Bad List" Product mathematically
        let rp = 1n;
        if (response.data.revokedPrimes && response.data.revokedPrimes.length > 0) {
            response.data.revokedPrimes.forEach(p => {
                rp *= BigInt(p);
            });
        }
        LOCAL_FTR_CACHE.revokedProduct = rp;

        console.log(`📡 [Sync] Root: ${LOCAL_FTR_CACHE.currentRoot.substring(0, 10)}... | Revoked Product Size: ${rp.toString().length} digits.`);
    } catch (error) {
        console.error("📡 [Sync Error] Ministry Server offline. Using cached state.");
    }
}

// Initial sync and periodic update
syncWithMinistry();
setInterval(syncWithMinistry, 30000);

/**
 * 🏥 ADAPTIVE VERIFICATION ENDPOINT
 */
app.post('/verify', async (req, res) => {
    console.log("\n--- NEW PRESCRIPTION SCAN ---");
    
    try {
        const { vc, rsaProof } = req.body;
        const primeToUse = rsaProof?.prime || rsaProof?.p || req.body.hospitalPrime;
        const witnessToUse = rsaProof?.witness || rsaProof?.w || req.body.statelessWitness;
        
        const expectedRoot = LOCAL_FTR_CACHE.currentRoot;

        if (!vc || !primeToUse || !witnessToUse || !expectedRoot) {
            return res.status(400).json({ error: "Missing Proof Data or Server not synced." });
        }

        const issuerDID = vc.issuer.id || vc.issuer;
        console.log(`🔍 Verifying Issuer: ${issuerDID}`);

        // --- GATE 1: DIGITAL SIGNATURE ---
        const jwtString = vc.proof?.jwt;
        const verifiedVC = await verifyCredential(jwtString, resolver);
        if (!verifiedVC) {
            console.error("❌ Gate 1 Failed: Forged Digital Signature.");
            return res.status(401).json({ success: false, message: "Gate 1: Signature Invalid" });
        }
        console.log("✅ Gate 1 Passed: Signature Authentic.");

        // --- GATE 2: STATELESS RSA MATH (Happy Path) ---
        let isMathValid = verifyGate2(witnessToUse, primeToUse, expectedRoot, LOCAL_FTR_CACHE.modulusN);

        if (isMathValid) {
            console.log("✅ Gate 2 Passed: Standard RSA Math Valid.");
        } else {
            // --- GATE 3: BÉZOUT PROOF OF INNOCENCE (Tier 3 Fallback) ---
            console.log("⚠️ Math mismatch (stale witness). Attempting Gate 3: Bézout Proof...");
            
            if (rsaProof?.bezout) {
                const a = BigInt(rsaProof.bezout.a);
                const b = BigInt(rsaProof.bezout.b);
                const P = BigInt(primeToUse);
                const RP = LOCAL_FTR_CACHE.revokedProduct;

                // THE BÉZOUT IDENTITY CHECK
                // If aP + b(RP) == 1, it is mathematically impossible for P to be a factor of RP
                if ((a * P) + (b * RP) === 1n) {
                    console.log("✅ Gate 3 Passed: Bézout Proof Verified! Patient's hospital is innocent.");
                    isMathValid = true; // Override the Gate 2 failure
                } else {
                    console.error("❌ Gate 3 Failed: Bézout Equation did not equal 1.");
                }
            } else {
                console.error("❌ Gate 3 Failed: No Bézout Defense provided in QR code.");
            }
        }

        // --- FINAL VERDICT ---
        if (!isMathValid) {
            console.error("🚨 VERDICT: REJECTED. Cryptographic Verification Failed.");
            return res.status(401).json({ success: false, message: "Hospital License Revoked or Math Invalid" });
        }

        console.log("🎉 VERDICT: DISPENSE APPROVED.");
        return res.status(200).json({ 
            success: true, 
            medicine: vc.credentialSubject.medicine || vc.credentialSubject.medication,
            issuer: issuerDID
        });

    } catch (error) {
        console.error("🚨 Server Error:", error.message);
        return res.status(500).json({ success: false, error: "Internal Error" });
    }
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Pharmacy Edge Server running on http://0.0.0.0:${PORT}`);
});