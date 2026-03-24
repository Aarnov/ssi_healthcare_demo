import { useEffect, useState } from 'react';
import api from '../api';
import axios from 'axios';

export default function Admin() {
  const [applications, setApplications] = useState([]);
  const [registry, setRegistry] = useState(null);

  const fetchData = async () => {
    try {
        const apps = await api.get('/admin/applications');
        setApplications(apps.data);

        const reg = await axios.get('http://localhost:3000/registry.json');
        setRegistry(reg.data);
    } catch (e) {
        console.error("Error connecting to Ministry Server");
    }
  };

  useEffect(() => { fetchData(); }, []);

  const approve = async (did) => {
    try {
      await api.post('/admin/approve', { did });
      alert('Hospital Approved & Added to Accumulator!');
      fetchData(); 
    } catch (err) {
      alert('Error approving');
    }
  };

  // --- NEW: Revocation Function ---
  const revoke = async (did) => {
    try {
      const confirm = window.confirm("Are you sure you want to mathematically revoke this hospital?");
      if (!confirm) return;
      
      await api.post('/admin/revoke', { did });
      alert('Hospital Revoked! Accumulator Trapdoor executed.');
      fetchData(); 
    } catch (err) {
      alert('Error revoking hospital');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ministry Dashboard</h1>
            <p className="text-gray-600">Federated Trust Registry Control</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Global Accumulator Root</p>
            <p className="font-mono text-xl font-bold text-green-700 max-w-[200px] truncate" title={registry?.accumulatorRoot}>
              {registry?.accumulatorRoot ? registry.accumulatorRoot.substring(0, 15) + "..." : "Loading..."}
            </p>
          </div>
        </header>

        <section className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-orange-600"> Pending Applications</h2>
          {applications.length === 0 ? (
            <p className="text-gray-500">No pending applications.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">License #</th>
                  <th className="text-left py-2">DID</th>
                  <th className="text-left py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app.id} className="border-t">
                    <td className="py-3">{app.name}</td>
                    <td className="py-3 font-mono">{app.licenseNumber}</td>
                    <td className="py-3 text-xs font-mono text-gray-500 truncate max-w-[150px]">{app.did}</td>
                    <td className="py-3">
                      <button 
                        onClick={() => approve(app.did)}
                        className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
                      >
                        Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-600"> Licensed Hospitals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {registry?.hospitals?.map((h, i) => (
              <div key={i} className={`border p-4 rounded ${h.status === 'REVOKED' ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
                <h3 className="font-bold">{h.name}</h3>
                <p className="text-sm text-gray-600 truncate" title={h.did}>DID: {h.did.substring(0,20)}...</p>
                <p className="text-sm text-gray-600">Prime ID: {h.prime}</p>
                
                {/* Status Badge & Revoke Button */}
                <div className="mt-4 flex justify-between items-center">
                  <div className={`text-xs px-2 py-1 rounded inline-block font-bold ${
                    h.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {h.status}
                  </div>
                  
                  {h.status === 'ACTIVE' && (
                    <button 
                      onClick={() => revoke(h.did)}
                      className="bg-red-600 text-white text-xs px-3 py-1 rounded hover:bg-red-700 transition"
                    >
                      Revoke License
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}