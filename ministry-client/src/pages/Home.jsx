import { useState } from 'react';
import api from '../api';

export default function Home() {
  const [form, setForm] = useState({ name: '', did: '', licenseNumber: '' });
  const [status, setStatus] = useState('');

const handleSubmit = async (e) => {
  e.preventDefault();
  setStatus('Sending...'); // Visual feedback
  try {
    const response = await api.post('/apply', form);
    setStatus(' Application Submitted! Waiting for Ministry Review.');
    setForm({ name: '', did: '', licenseNumber: '' }); // Clear form on success
  } catch (err) {
    // This catches the 400 error we just added to the backend
    setStatus('❌ ' + (err.response?.data?.error || "Connection Error"));
  }
};

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-blue-900">🏥 Hospital Licensing</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Hospital Name</label>
            <input 
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              type="text" 
              placeholder="e.g. Apollo Chennai"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">DID (Digital ID)</label>
            <input 
              className="mt-1 block w-full border border-gray-300 rounded-md p-2 font-mono text-xs"
              type="text" 
              placeholder="did:key:z6Mk..."
              value={form.did}
              onChange={e => setForm({...form, did: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Govt License #</label>
            <input 
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              type="text" 
              placeholder="GOV-TN-XXXX"
              value={form.licenseNumber}
              onChange={e => setForm({...form, licenseNumber: e.target.value})}
              required
            />
          </div>
          <button className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition">
            Submit Application
          </button>
        </form>
        {status && <p className="mt-4 text-center font-medium">{status}</p>}
      </div>
      <div className="mt-8 text-sm text-gray-500">
        <a href="/admin" className="underline">Ministry Official Login</a>
      </div>
    </div>
  );
}