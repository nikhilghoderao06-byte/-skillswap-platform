'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { swapAPI, skillAPI, userAPI } from '@/utils/api';
import Link from 'next/link';

export default function RequestsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [activeTab, setActiveTab] = useState('incoming');
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [skills, setSkills] = useState([]);
  const [users, setUsers] = useState([]);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setError('');
      const result = await swapAPI.getUserRequests(user.id);
      setIncoming(result.incoming || []);
      setOutgoing(result.outgoing || []);

      const allSkills = await skillAPI.getAllSkills();
      setSkills(allSkills);

      const allUsers = await userAPI.getAllUsers();
      setUsers(allUsers);
    } catch (err) {
      setError(err.message || 'Failed to load requests');
    } finally {
      setPageLoading(false);
    }
  };

  const handleAccept = async (requestId) => {
    if (!window.confirm('Accept this skill exchange request?')) {
      return;
    }

    setProcessingId(requestId);
    setError('');

    try {
      await swapAPI.acceptRequest(requestId);
      setSuccessMessage('✅ Request accepted! You can now schedule a session.');
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchData();
    } catch (err) {
      setError('Failed to accept: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId) => {
    if (!window.confirm('Reject this request?')) {
      return;
    }

    setProcessingId(requestId);
    setError('');

    try {
      await swapAPI.rejectRequest(requestId);
      setSuccessMessage('❌ Request rejected');
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchData();
    } catch (err) {
      setError('Failed to reject: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const getSkillName = (skillId) => {
    const skill = skills.find(s => s.id === skillId);
    return skill ? skill.skill_name : 'Skill #' + skillId;
  };

  const getUserName = (userId) => {
    const u = users.find(u => u.id === userId);
    return u ? `${u.first_name} ${u.last_name}` : 'Student #' + userId;
  };

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-indigo-600">SkillSwap</Link>
          <div className="flex gap-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
            <Link href="/students" className="text-gray-600 hover:text-gray-900">Students</Link>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                router.push('/login');
              }}
              className="text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Skill Exchange Requests</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            ⚠️ {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            {successMessage}
          </div>
        )}

        <div className="flex gap-4 mb-8 border-b">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'incoming'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-600'
            }`}
          >
            📥 Incoming ({incoming.length})
          </button>
          <button
            onClick={() => setActiveTab('outgoing')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'outgoing'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-600'
            }`}
          >
            📤 Outgoing ({outgoing.length})
          </button>
        </div>

        {activeTab === 'incoming' && (
          <div className="space-y-4">
            {incoming.length > 0 ? (
              incoming.map((req) => (
                <div key={req.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{getUserName(req.requester_id)}</h3>
                      <p className="text-sm text-gray-600">Wants to exchange skills</p>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                      req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      req.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded p-4 mb-4 space-y-2">
                    {req.skill_teach_id && (
                      <p className="text-sm"><strong>🎯 Can teach:</strong> {getSkillName(req.skill_teach_id)}</p>
                    )}
                    <p className="text-sm"><strong>📚 Wants to learn:</strong> {getSkillName(req.skill_learn_id)}</p>
                    <p className="text-sm"><strong>💬 Mode:</strong> {req.mode}</p>
                    {req.message && (
                      <p className="text-sm italic bg-white p-2 rounded">"{req.message}"</p>
                    )}
                  </div>

                  {req.status === 'pending' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAccept(req.id)}
                        disabled={processingId === req.id}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {processingId === req.id ? 'Processing...' : '✅ Accept'}
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        disabled={processingId === req.id}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {processingId === req.id ? 'Processing...' : '❌ Reject'}
                      </button>
                    </div>
                  )}

                  {req.status === 'accepted' && (
                    <div className="bg-green-50 border border-green-200 rounded p-4">
                      <p className="text-green-800 font-medium">✅ Accepted!</p>
                      <p className="text-sm text-green-700 mt-1">They will review you after your session.</p>
                    </div>
                  )}

                  {req.status === 'rejected' && (
                    <div className="bg-red-50 border border-red-200 rounded p-4">
                      <p className="text-red-800 font-medium">❌ Rejected</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500">No incoming requests</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'outgoing' && (
          <div className="space-y-4">
            {outgoing.length > 0 ? (
              outgoing.map((req) => (
                <div key={req.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{getUserName(req.provider_id)}</h3>
                      <p className="text-sm text-gray-600">Your request</p>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                      req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      req.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded p-4 mb-4 space-y-2">
                    {req.skill_teach_id && (
                      <p className="text-sm"><strong>🎯 You teach:</strong> {getSkillName(req.skill_teach_id)}</p>
                    )}
                    <p className="text-sm"><strong>📚 You learn:</strong> {getSkillName(req.skill_learn_id)}</p>
                    <p className="text-sm"><strong>💬 Mode:</strong> {req.mode}</p>
                    {req.message && (
                      <p className="text-sm italic bg-white p-2 rounded">"{req.message}"</p>
                    )}
                  </div>

                  {req.status === 'pending' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                      <p className="text-yellow-800 font-medium">⏳ Waiting for response...</p>
                    </div>
                  )}

                  {req.status === 'accepted' && (
                    <div className="bg-green-50 border border-green-200 rounded p-4">
                      <p className="text-green-800 font-medium">✅ Accepted!</p>
                      <p className="text-sm text-green-700 mt-1">Schedule a session and then you can leave a review.</p>
                    </div>
                  )}

                  {req.status === 'rejected' && (
                    <div className="bg-red-50 border border-red-200 rounded p-4">
                      <p className="text-red-800 font-medium">❌ Declined</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500">No outgoing requests</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}