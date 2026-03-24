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
    currentRoot: "",     // Will be pulled from Ministry
    activeHospitals: []  // List of active DIDs for Tier 2 fallback
};

/**
 * 🔄 FTR SYNC ENGINE
 * Pulls the Ground Truth from the Ministry every 30 seconds.
 */
async function syncWithMinistry() {
    try {
        const response = await axios.get('http://localhost:3000/registry.json');
        LOCAL_FTR_CACHE.currentRoot = response.data.accumulatorRoot;
        LOCAL_FTR_CACHE.activeHospitals = response.data.hospitals || [];
        console.log(`📡 [Sync] Ministry Root Updated: ${LOCAL_FTR_CACHE.currentRoot.substring(0, 15)}...`);
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
        
        // 🚨 ENFORCING GROUND TRUTH: Use Ministry Root, not the QR's root.
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

        // --- GATE 2: STATELESS RSA MATH ---
        // Step 1: Membership Check (The O(1) Path)
        let isGate2Valid = verifyGate2(witnessToUse, primeToUse, expectedRoot, LOCAL_FTR_CACHE.modulusN);

        // Step 2: Tier 2 Fallback (Handles Stale Witnesses for Offline Patients)
        if (!isGate2Valid) {
            console.log("⚠️ Math mismatch (likely stale witness). Checking Registry status...");
            const hospitalInRegistry = LOCAL_FTR_CACHE.activeHospitals.find(h => h.did === issuerDID);
            
            // If the hospital is still ACTIVE in our snapshot, we approve despite the stale math.
            if (hospitalInRegistry && hospitalInRegistry.status === 'ACTIVE') {
                console.log("✅ Hospital is still ACTIVE in FTR. Overriding for Offline Patient.");
                isGate2Valid = true; 
            }
        }

        if (!isGate2Valid) {
            console.error("❌ Gate 2 Failed: Hospital License Revoked.");
            return res.status(401).json({ success: false, message: "Hospital License Revoked" });
        }
        console.log("✅ Gate 2 Passed: Hospital Trusted.");

        // --- FINAL APPROVAL ---
        console.log("🎉 DISPENSE APPROVED.");
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