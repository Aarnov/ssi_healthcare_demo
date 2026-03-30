import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Scan, CheckCircle, XCircle, ShieldAlert, Activity, ShieldCheck, Pill, ArrowRight } from 'lucide-react';

function App() {
  const [view, setView] = useState('HOME'); // 'HOME', 'SCAN'
  const [scanResult, setScanResult] = useState(null);

  const handleScan = (detectedCodes) => {
    if (detectedCodes?.length > 0) {
      const rawValue = detectedCodes[0].rawValue;
      if (rawValue) processPrescriptionScan(rawValue);
    }
  };

  const processPrescriptionScan = async (text) => {
    setView('HOME'); 
    setScanResult({ status: 'loading', message: 'Executing Zero-Knowledge Proof...' });
    
    try {
      const payload = JSON.parse(text);
      
      if (!payload.vc) {
        throw new Error("Invalid payload structure. Missing Verifiable Credential.");
      }

      // --- NEW: Hardcoded to Port 5000 to hit our Pharmacy Edge Server ---
      const serverUrl = 'http://10.9.175.124:5000/verify';

      const response = await fetch(serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send the exact payload directly! The backend will extract the witness/prime.
        body: JSON.stringify(payload) 
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setScanResult({ 
          status: 'success', 
          medicine: data.medicine,
          issuer: data.issuer,
          message: 'Dual-Gate Passed: Cryptographic Signature & Active Hospital License Verified.' 
        });
      } else {
        setScanResult({ 
          status: 'error', 
          message: data.message || 'Verification Failed at Ministry Gates.' 
        });
      }

    } catch (error) {
      console.error(error);
      setScanResult({ 
        status: 'error', 
        message: 'Cryptographic Verification Failed. Invalid or forged data structure.' 
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f9] p-4 md:p-8 font-sans text-slate-900 flex flex-col items-center">
      
      {/* Header */}
      <header className="w-full max-w-3xl mb-8 flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Local Network Secure</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Pharmacy Desk</h1>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl">
          <Activity size={16} className="text-blue-500" />
          <span className="text-xs font-bold text-slate-600 uppercase">Offline FTR Cached</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-3xl flex-1 flex flex-col">
        {view === 'SCAN' ? (
          <div className="bg-slate-900 p-6 md:p-10 rounded-[2.5rem] shadow-2xl relative flex flex-col items-center animate-in fade-in zoom-in-95 duration-300 w-full max-w-md mx-auto">
            <h2 className="text-white text-xl font-bold mb-2">Scan Prescription</h2>
            <p className="text-slate-400 text-sm mb-8 text-center">Position the patient's SSI QR code within the frame.</p>
            
            {/* Viewfinder styling for scanner */}
            <div className="w-full aspect-square rounded-3xl overflow-hidden border-4 border-slate-700 relative shadow-[0_0_40px_rgba(59,130,246,0.15)]">
              <div className="absolute inset-0 border-2 border-blue-500/30 rounded-3xl z-10 pointer-events-none"></div>
              <Scanner onScan={handleScan} styles={{ container: { width: '100%', height: '100%' } }} />
            </div>
            
            <button 
              onClick={() => setView('HOME')} 
              className="mt-10 text-slate-400 hover:text-white transition-colors bg-white/5 p-4 rounded-full"
            >
              <XCircle size={36} strokeWidth={1.5} />
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 md:p-12 text-center animate-in fade-in duration-500">
            
            {!scanResult ? (
              // Idle State
              <div className="py-10">
                <div className="w-28 h-28 bg-blue-50/50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                  <div className="absolute inset-0 rounded-full border border-blue-100 animate-[spin_10s_linear_infinite]"></div>
                  <Scan size={48} strokeWidth={1.5} />
                </div>
                
                <h2 className="text-3xl font-black text-slate-800 mb-4">Verify Medication</h2>
                <p className="text-slate-500 mb-12 max-w-md mx-auto leading-relaxed">
                  Execute zero-knowledge offline verification against the Ministry Registry using Cryptographic Gateways.
                </p>
                
                <button 
                  onClick={() => setView('SCAN')}
                  className="bg-slate-900 hover:bg-blue-600 text-white font-bold py-5 px-12 rounded-[1.5rem] transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 text-lg flex items-center gap-3 mx-auto"
                >
                  <Scan size={24} /> Initialize Scanner
                </button>
              </div>
            ) : (
              // Results State
              <div className="animate-in slide-in-from-bottom-8 fade-in duration-500 text-left">
                
                {/* Dynamic Status Header */}
                <div className={`p-6 rounded-3xl border-2 mb-6 flex items-center gap-5 ${
                  scanResult.status === 'loading' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                  scanResult.status === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-[0_0_30px_rgba(16,185,129,0.15)]' :
                  'bg-red-50 border-red-500 text-red-800 shadow-[0_0_30px_rgba(239,68,68,0.15)]'
                }`}>
                  {scanResult.status === 'loading' && <Activity className="animate-spin text-amber-500" size={36} />}
                  {scanResult.status === 'success' && <ShieldCheck className="text-emerald-500" size={40} />}
                  {scanResult.status === 'error' && <ShieldAlert className="text-red-500" size={40} />}
                  
                  <div>
                    <h3 className="text-xl md:text-2xl font-black tracking-tight">
                      {scanResult.status === 'loading' ? 'Verifying Payload...' :
                       scanResult.status === 'success' ? 'VALID: Dispense Approved' : 
                       'REJECTED: Do Not Dispense'}
                    </h3>
                    <p className={`text-sm font-medium mt-1 ${
                      scanResult.status === 'loading' ? 'text-amber-600/80' :
                      scanResult.status === 'success' ? 'text-emerald-600/80' : 'text-red-600/80'
                    }`}>
                      {scanResult.message}
                    </p>
                  </div>
                </div>

                {/* Success Data Card */}
                {scanResult.status === 'success' && (
                  <div className="bg-slate-50 border border-slate-200 p-8 rounded-3xl mb-8">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Target Medication</p>
                    <div className="flex items-start gap-4 mb-8">
                      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mt-1">
                        <Pill className="text-blue-500" size={32}/>
                      </div>
                      <p className="text-3xl md:text-4xl font-black text-slate-800 leading-tight">
                        {scanResult.medicine}
                      </p>
                    </div>
                    
                    <div className="pt-6 border-t border-slate-200">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Hospital Issuer Identity (DID)</p>
                      <div className="bg-white p-3 rounded-xl border border-slate-200 overflow-x-auto">
                        <p className="text-xs font-mono text-slate-500 whitespace-nowrap">
                          {scanResult.issuer}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reset / Scan Next Button */}
                {scanResult.status !== 'loading' && (
                  <button 
                    onClick={() => {
                      setScanResult(null);
                      setView('SCAN');
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-5 rounded-[1.5rem] transition-colors flex items-center justify-center gap-2 text-lg"
                  >
                    Scan Next Prescription <ArrowRight size={20} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;