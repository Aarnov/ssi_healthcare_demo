import React, { useState } from 'react';
import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react'; 
import { Stethoscope, ClipboardCheck, Database, QrCode, XCircle } from 'lucide-react';

export default function DoctorDashboard() {
  const [formData, setFormData] = useState({ 
    patientDID: '', 
    medicine: '', 
    notes: '' 
  });
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState(null);


  const HOSPITAL_DID = "did:key:z6MkgEKa1d5JECUMbaDJqzhWXoU5pj1eEWN7Pp44E47kFNJk"; 

  const handleIssue = async () => {
    if (!formData.patientDID || !formData.medicine) {
      alert("Please fill in the Patient DID and Medicine name.");
      return;
    }

    setLoading(true);
    try {
      // 1. Call your Hospital Backend
      // (The backend will generate the VC, fetch the Witness, and bundle them!)
      const res = await axios.post('http://localhost:4000/api/issue', {
          patientDID: formData.patientDID,
          medicine: formData.medicine,
          notes: formData.notes
      });
      
      if (!res.data.success || !res.data.payload) {
          throw new Error("Hospital backend failed to generate secure payload.");
      }

      // 2. The packet is already perfectly bundled by the server. Just stringify it!
      const finalPacket = res.data.payload;

      // 3. Show QR to the patient
      setQrData(JSON.stringify(finalPacket)); 
      
    } catch (err) {
      console.error("Issuance Error:", err);
      alert("Error: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        
        {/* If QR is ready, show Overlay */}
        {qrData && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl animate-in fade-in zoom-in">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Scan to Collect</h2>
                <button onClick={() => setQrData(null)} className="text-gray-400 hover:text-red-500">
                  <XCircle size={32} />
                </button>
              </div>
              
              <div className="bg-white p-4 rounded-xl border-4 border-blue-100 inline-block mb-6">
                <QRCodeCanvas 
                  value={qrData} 
                  size={350} 
                  level={"L"} 
                  includeMargin={true}
                />
              </div>

              <p className="text-sm text-gray-500 mb-6">
                Ask the patient to open their <b>Secure Wallet</b> and scan this code to receive their prescription offline.
              </p>

              <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 font-mono text-left overflow-hidden">
                <div className="font-bold mb-1">Packet Contents:</div>
                <div className="truncate">VC Signature: VALID</div>
                <div>RSA Witness: INCLUDED</div>
              </div>
            </div>
          </div>
        )}

        {/* Main Dashboard */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="bg-blue-600 p-6 text-white flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Stethoscope size={32} />
              <div>
                <h1 className="text-2xl font-bold">Doctor's Issuance Portal</h1>
                <p className="text-blue-100 text-sm">Authenticated as General Hospital</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Patient DID</label>
                <input 
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                  placeholder="did:key:..." 
                  value={formData.patientDID}
                  onChange={(e) => setFormData({...formData, patientDID: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Medication</label>
                <input 
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Amoxicillin" 
                  value={formData.medicine}
                  onChange={(e) => setFormData({...formData, medicine: e.target.value})} 
                />
              </div>
            </div>

            <button 
              onClick={handleIssue} 
              disabled={loading}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all ${
                loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? "Generating Cryptography..." : <><QrCode size={22} /> Generate Offline QR</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}