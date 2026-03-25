import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import { TrustEngine } from './accumulator.js'; 

const app = express();
const PORT = 3000; 

app.use(cors());
app.use(bodyParser.json());

const REGISTRY_FILE = 'registry.json';
const PENDING_FILE = 'pending_applications.json';

// --- Initialization ---
if (!fs.existsSync(REGISTRY_FILE)) {
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify({
        lastUpdated: new Date().toISOString(),
        accumulatorRoot: "2",
        hospitals: [] 
    }, null, 2));
}
if (!fs.existsSync(PENDING_FILE)) {
    fs.writeFileSync(PENDING_FILE, JSON.stringify([]));
}

function getPending() { try { return JSON.parse(fs.readFileSync(PENDING_FILE)); } catch (e) { return []; } }
function savePending(data) { fs.writeFileSync(PENDING_FILE, JSON.stringify(data, null, 2)); }
function getRegistry() { 
    try { 
        const data = JSON.parse(fs.readFileSync(REGISTRY_FILE)); 
        if (!data.hospitals) { data.hospitals = []; data.accumulatorRoot = "2"; }
        return data;
    } catch (e) { return { hospitals: [], accumulatorRoot: "2" }; } 
}
function saveRegistry(data) { fs.writeFileSync(REGISTRY_FILE, JSON.stringify(data, null, 2)); }


// --- Endpoints ---

app.post('/api/apply', (req, res) => {
    const { did, name, licenseNumber } = req.body;
    const pending = getPending();
    pending.push({ id: Date.now(), did, name, licenseNumber, status: 'PENDING_REVIEW' });
    savePending(pending);
    res.json({ success: true });
});

app.get('/api/admin/applications', (req, res) => res.json(getPending()));

app.post('/api/admin/approve', (req, res) => {
    const { did, name, licenseNumber } = req.body;
    let pending = getPending();
    const appIndex = pending.findIndex(a => a.did === did);
    
    let hospitalData = appIndex !== -1 ? pending.splice(appIndex, 1)[0] : { did, name, licenseNumber };
    savePending(pending);

    try {
        const result = TrustEngine.add(did); 
        const registry = getRegistry();
        
        registry.lastUpdated = new Date().toISOString();
        registry.accumulatorRoot = result.root;
        const newRecord = { did, name: hospitalData.name, licenseNumber: hospitalData.licenseNumber, prime: result.prime, status: 'ACTIVE' };
        
        const existingIndex = registry.hospitals.findIndex(h => h.did === did);
        if (existingIndex >= 0) registry.hospitals[existingIndex] = newRecord;
        else registry.hospitals.push(newRecord);

        saveRegistry(registry);
        console.log(`✅ Hospital Approved: ${did}`);
        res.json({ success: true, newRoot: result.root });
    } catch (err) {
        console.error("Approval Error:", err);
        res.status(500).json({ error: "Failed to update Accumulator" });
    }
});

app.post('/api/admin/revoke', (req, res) => {
    const { did } = req.body;
    const registry = getRegistry();
    const hospitalIndex = registry.hospitals.findIndex(h => h.did === did);

    try {
        const result = TrustEngine.revoke(did);
        registry.accumulatorRoot = result.newRoot;
        if (hospitalIndex >= 0) {
            registry.hospitals[hospitalIndex].status = 'REVOKED';
        }
        saveRegistry(registry);
        console.log(`🚨 Hospital Revoked: ${did}`);
        res.json({ success: true, newRoot: result.newRoot });
    } catch (err) {
        console.error("Revocation Error:", err);
        res.status(500).json({ error: "System error during revocation." });
    }
});

app.get('/api/witness', (req, res) => {
    const { did } = req.query;
    try {
        res.json({ 
            witness: TrustEngine.createWitness(did), 
            root: TrustEngine.getRoot(), 
            prime: TrustEngine.getPrime(did),
            epoch: TrustEngine.getEpoch() // 🚨 ADD THIS LINE
        });
    } catch (err) {
        res.status(500).json({ error: "Witness generation failed" });
    }
});

app.get('/registry.json', (req, res) => res.json(getRegistry()));


// --- 🔄 TIER 1: WALLET SYNC ENDPOINT ---
app.get('/api/deltas', (req, res) => {
    const clientEpoch = parseInt(req.query.since) || 0;
    const missedEvents = TrustEngine.getHistoryLog().filter(event => event.epoch > clientEpoch);

    res.json({
        latestEpoch: TrustEngine.getEpoch(),
        currentRoot: TrustEngine.getRoot(),
        addedPrimes: missedEvents.filter(e => e.type === 'ADD').map(e => ({ prime: e.prime, epoch: e.epoch })),
        revokedDIDs: missedEvents.filter(e => e.type === 'REVOKE').map(e => e.did),
        // 🚨 TIER 3 UPDATE: We now send the revoked primes so the pharmacy can build the "Bad List"
        revokedPrimes: missedEvents.filter(e => e.type === 'REVOKE').map(e => e.prime) 
    });
});


// --- 🛡️ TIER 3: BÉZOUT INNOCENCE PROOF ENDPOINT ---
app.get('/api/innocence-proof', (req, res) => {
    const { prime } = req.query;
    
    if (!prime) {
        return res.status(400).json({ error: "Missing hospital prime in request parameters." });
    }

    try {
        const proof = TrustEngine.getInnocenceProof(prime);
        
        if (!proof) {
            // If no hospitals have ever been revoked, there's no need for a defense
            return res.json({ message: "No revocations exist yet.", a: null, b: null });
        }
        
        console.log(`🛡️ Generated Bezout Defense for Prime: ${prime}`);
        res.json(proof); // Returns { a, b, revokedProduct }
    } catch (err) {
        console.error("Innocence Proof Generation Failed:", err);
        res.status(500).json({ error: "Failed to generate Bezout proof." });
    }
});


app.listen(PORT, () => console.log(`🏛️ MINISTRY SERVER running on Port ${PORT}`));