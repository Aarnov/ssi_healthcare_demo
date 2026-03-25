import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import fs from 'fs'
import axios from 'axios' // <-- ADDED: For fetching the witness from the Ministry
import { agent } from './agent.js' // Imports your new SQLite-powered agent

const app = express()
const PORT = 4000

// --- PERSISTENCE VARIABLE ---
let hospitalDID = null;

// --- DATABASE MOCK (EMR) ---
// We keep the EMR in a JSON file for now (easy to read/debug)
const EMR_FILE = 'hospital_emr.json'
let EMR = { prescriptions: [] }

if (fs.existsSync(EMR_FILE)) {
    EMR = JSON.parse(fs.readFileSync(EMR_FILE))
} else {
    fs.writeFileSync(EMR_FILE, JSON.stringify(EMR))
}

app.use(cors())
app.use(bodyParser.json())

// --- STARTUP LOGIC (Fixed for Persistence) ---
async function startHospital() {
  console.log('🏥 Booting Hospital Server...');

  // 1. Ask the Database: "Do I already have an identity?"
  const existingDids = await agent.didManagerFind({ provider: 'did:key' });

  if (existingDids.length > 0) {
      // ✅ FOUND: Use the existing identity
      hospitalDID = existingDids[0].did;
      console.log(`🔹 Loaded Existing Identity from Database.`);
  } else {
      // ❌ NOT FOUND: Create a new one (First run only)
      console.log(`🔹 First Run Detected: Creating New Identity...`);
      const identity = await agent.didManagerCreate({ 
          alias: 'General Hospital', 
          provider: 'did:key',
          kms: 'local'
      });
      hospitalDID = identity.did;
  }
  
  console.log('\n==================================================');
  console.log('✅ HOSPITAL DID (COPY THIS FOR MINISTRY PORTAL):');
  console.log(`\x1b[33m${hospitalDID}\x1b[0m`); // Prints in Yellow
  console.log('==================================================\n');
}

// --- ENDPOINTS ---

/**
 * [DOCTOR] Issue Prescription
 * Step 4: Bundle VC + RSA Witness
 */
app.post('/api/issue', async (req, res) => {
    try {
        const { patientDID, medicine, notes } = req.body
        
        if (!hospitalDID) {
            throw new Error("Server is not ready (No DID found).")
        }

        console.log(`\n💊 [Step 4] Prescribing ${medicine} to ${patientDID?.substring(0,15) || 'Unknown'}...`)

        // 1. Create Verifiable Credential (VC)
        const vc = await agent.createVerifiableCredential({
            credential: {
                issuer: { id: hospitalDID },
                issuanceDate: new Date().toISOString(),
                credentialSubject: {
                    id: patientDID,
                    type: 'MedicalPrescription',
                    medicine: medicine,
                    instructions: notes || 'Take as directed'
                }
            },
            proofFormat: 'jwt',
            save: false
        })

        // 2. Save to local EMR (Electronic Medical Record)
        EMR.prescriptions.push({
            recipient: patientDID,
            vc: vc,
            timestamp: new Date().toISOString()
        })
        fs.writeFileSync(EMR_FILE, JSON.stringify(EMR, null, 2))

// 3. Fetch the Mathematical Witness from the Ministry
        console.log(`🔗 Fetching Witness from Ministry for DID: ${hospitalDID}`);
        const ministryResponse = await axios.get(`http://localhost:3000/api/witness?did=${hospitalDID}`);
        
        // 🚨 EXTRACT THE EPOCH HERE:
        const { witness, prime, root, epoch } = ministryResponse.data;

        // 4. RETURN THE BUNDLED PAYLOAD TO THE CLIENT
        res.json({ 
            success: true, 
            message: "Prescription Signed and Witness Attached",
            payload: {
                vc: vc,
                statelessWitness: witness,
                hospitalPrime: prime, 
                globalRootAtIssuance: root,
                epoch: epoch // 🚨 STAMP IT INTO THE QR CODE HERE
            }
        })
        // --- NEW LOGIC END ---

    } catch (e) {
        console.error("❌ Issuance Error:", e.message)
        res.status(500).json({ error: e.message })
    }
})

// [PATIENT] Sync (Optional Helper)
app.get('/api/sync', (req, res) => {
    const { did } = req.query
    const records = EMR.prescriptions.filter(p => p.recipient === did)
    res.json({ count: records.length, credentials: records.map(r => r.vc) })
})

// --- START SERVER ---
app.listen(PORT, async () => {
    await startHospital()
    console.log(`🏥 Hospital Server running on http://localhost:${PORT}`)
})