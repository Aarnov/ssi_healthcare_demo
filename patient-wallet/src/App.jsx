import React, { useState, useEffect } from 'react';
import { getOrGenerateDID, getCredentials, saveCredential, saveAllCredentials } from './utils/identity';
import { syncWalletWithMinistry } from './utils/sync';
import { QRCodeCanvas } from 'qrcode.react'; 
import { Scanner } from '@yudiel/react-qr-scanner'; 
import { Scan, Pill, User, XCircle, CheckCircle, Copy, ShieldCheck, QrCode, RefreshCw } from 'lucide-react';
import './index.css'

function App() {
  const [view, setView] = useState('HOME');
  const [did, setDid] = useState('');
  const [creds, setCreds] = useState([]);
  const [showIdentity, setShowIdentity] = useState(false);
  const [selectedCred, setSelectedCred] = useState(null); 
  const [scanStatus, setScanStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); 

  useEffect(() => {
    setDid(getOrGenerateDID());
    const loadedCreds = getCredentials();
    setCreds(loadedCreds);
    if (loadedCreds.length > 0) {
      // Auto-sync in background silently
      handleSync(loadedCreds, true);
    }
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(did);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

// The Sync Handler (with mobile alerts and Deep Clone UI Fix)
  const handleSync = async (currentCreds = creds, isSilent = false) => {
    setIsSyncing(true);
    const { updatedCredentials, needsSave } = await syncWalletWithMinistry(currentCreds);
    
    if (needsSave) {
      // 🚨 THE FIX: Force a deep clone so React redraws the QR codes!
      const deeplyClonedCreds = JSON.parse(JSON.stringify(updatedCredentials));
      
      saveAllCredentials(deeplyClonedCreds);
      setCreds(deeplyClonedCreds); 
      
      if (!isSilent) {
        const newEpoch = deeplyClonedCreds[0]?.rsaProof?.epoch || "Updated";
        alert(`✅ Sync Complete!\nFast-forwarded to Epoch ${newEpoch}`);
      }
    } else {
      if (!isSilent) alert(`ℹ️ Wallet is already up to date or offline.`);
    }
    
    setTimeout(() => setIsSyncing(false), 500); 
  };

  const handleScan = (detectedCodes) => {
    if (detectedCodes?.length > 0) {
      const rawValue = detectedCodes[0].rawValue;
      if (rawValue) processScan(rawValue);
    }
  };

  const processScan = (text) => {
    try {
      const parsed = JSON.parse(text);
      
      if (!parsed.vc) return setScanStatus("❌ Error: Missing VC in payload!");
      if (!parsed.rsa && !parsed.statelessWitness && !parsed.rsaProof) {
        return setScanStatus("❌ Error: Missing RSA Witness in payload!");
      }

      const targetDID = parsed.vc.credentialSubject.id.trim();
      const myDID = did.trim();

      if (targetDID !== myDID) return setScanStatus("❌ Verification Failed: Recipient Mismatch");

      if (saveCredential(parsed)) {
        setScanStatus("✅ Prescription Verified & Saved");
        setCreds(getCredentials());
        setTimeout(() => { setScanStatus(''); setView('HOME'); }, 1500);
      } else {
        setScanStatus("ℹ️ This document is already in your Vault");
        setTimeout(() => { setScanStatus(''); setView('HOME'); }, 1500);
      }
    } catch (e) { 
      setScanStatus("❌ Invalid Secure Format"); 
    }
  };

  if (view === 'SCAN') {
    return (
      <div className="h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-full max-w-sm relative rounded-[2rem] overflow-hidden border-2 border-white/10 shadow-2xl">
          <Scanner onScan={handleScan} styles={{ container: { width: '100%' } }} />
          <div className="absolute top-0 left-0 w-full scan-line z-10"></div>
        </div>
        <div className="mt-8 text-center">
          <ShieldCheck className="mx-auto text-blue-400 mb-2" size={32} />
          <p className="text-slate-300 text-sm font-medium">{scanStatus || "Position QR code within frame"}</p>
        </div>
        <button onClick={() => setView('HOME')} className="mt-12 text-slate-400 hover:text-white transition-colors">
          <XCircle size={40} strokeWidth={1.5} />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full min-h-screen mx-auto bg-[#f8fafc] text-slate-900 flex flex-col font-sans relative shadow-xl">
      
      {/* Header */}
      <header className="px-6 pt-10 pb-6 bg-white border-b border-slate-100 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Secure Health Vault</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">MediVault</h1>
        </div>
        <div className="flex gap-2">
          {/* Sync Button */}
          <button 
            onClick={() => handleSync(creds, false)} 
            disabled={isSyncing}
            className={`w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 transition-colors ${isSyncing ? 'opacity-50' : 'hover:bg-slate-100'}`}
          >
            <RefreshCw size={20} className={isSyncing ? 'animate-spin text-blue-600' : ''} />
          </button>
          {/* Identity Button */}
          <button 
            onClick={() => setShowIdentity(true)} 
            className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <User size={22} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 pt-8 pb-32">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Your Records</h2>
          <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100">
            {creds.length} ENCRYPTED
          </span>
        </div>

        {creds.length === 0 ? (
          <div className="medical-card rounded-[2rem] p-12 text-center bg-white border border-slate-100 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Pill size={32} className="text-slate-300" />
            </div>
            <h3 className="font-bold text-slate-800 mb-2">No active prescriptions</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              When a doctor issues a digital prescription, tap the scan button below to securely import it.
            </p>
          </div>
        ) : (
          creds.map((c, i) => (
            <div key={i} className={`medical-card bg-white border shadow-sm rounded-2xl p-5 mb-4 group relative ${c.status === 'REVOKED' ? 'border-red-200' : 'border-slate-100'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.status === 'REVOKED' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                  {c.status === 'REVOKED' ? <XCircle size={24} /> : <Pill size={24} />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className={`font-bold ${c.status === 'REVOKED' ? 'text-red-700 line-through' : 'text-slate-800'}`}>
                        {c.vc?.credentialSubject?.medicine || "Unknown"}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.vc?.credentialSubject?.instructions || ""}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedCred(c)}
                      disabled={c.status === 'REVOKED'}
                      className={`p-2 rounded-lg transition ${c.status === 'REVOKED' ? 'bg-slate-100 text-slate-300' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'}`}
                    >
                      <QrCode size={20} />
                    </button>
                  </div>
                  
                  {/* Updated Footer with Epoch, Status, AND Witness Proof */}
                  <div className="mt-4 flex flex-col gap-2 border-t border-slate-50 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                        Epoch: {c.rsaProof?.epoch || c.epoch || 0}
                      </span>
                      
                      {c.status === 'REVOKED' ? (
                        <span className="text-[9px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 uppercase flex items-center gap-1">
                          <XCircle size={10} /> Revoked
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase flex items-center gap-1">
                          <CheckCircle size={10} /> Valid
                        </span>
                      )}
                    </div>
                    {/* Visual proof that the math is actually changing */}
                    <span className="text-[8px] font-mono text-slate-300 break-all">
                      Proof: {c.rsaProof?.witness?.substring(0, 15) || c.statelessWitness?.substring(0, 15) || "Missing"}...
                    </span>
                  </div>

                </div>
              </div>
            </div>
          ))
        )}
      </main>

      {/* FAB */}
      <div className="fixed bottom-0 left-0 right-0 p-8 max-w-md mx-auto bg-gradient-to-t from-[#f8fafc] via-[#f8fafc] to-transparent">
        <button 
          onClick={() => setView('SCAN')} 
          className="w-full h-14 bg-slate-900 rounded-xl shadow-lg shadow-slate-200 flex items-center justify-center gap-3 font-bold text-white transition-all hover:bg-blue-600 active:scale-95"
        >
          <Scan size={20} />
          <span className="text-sm tracking-wide">Import Medical Record</span>
        </button>
      </div>

      {/* Prescription QR Sharing Modal */}
      {selectedCred && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-end justify-center sm:items-center p-4" onClick={() => setSelectedCred(null)}>
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8"></div>
            <h3 className="text-xl font-bold text-slate-900 mb-1">Pharmacy Dispense</h3>
            <p className="text-sm text-slate-500 mb-6 font-medium bg-slate-50 p-2 rounded-lg mx-4">
              {selectedCred.vc?.credentialSubject?.medicine}
            </p>
            <div className="flex justify-center mb-8 bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
              <QRCodeCanvas value={JSON.stringify(selectedCred)} size={180} level={"L"} />
            </div>
            <button onClick={() => setSelectedCred(null)} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-lg">
              Done
            </button>
          </div>
        </div>
      )}

      {/* Identity Modal */}
      {showIdentity && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-end justify-center sm:items-center p-4" onClick={() => setShowIdentity(false)}>
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8"></div>
            <div className="text-center mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-1">Digital Identity Card</h3>
                <div className="flex items-center justify-center gap-2 text-slate-400 overflow-hidden" onClick={copyToClipboard}>
                    <p className="text-[10px] font-mono truncate max-w-[200px]">{did}</p>
                    {copied ? <CheckCircle size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </div>
            </div>
            <div className="flex justify-center mb-8 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <QRCodeCanvas value={did} size={180} />
            </div>
            <button onClick={() => setShowIdentity(false)} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;