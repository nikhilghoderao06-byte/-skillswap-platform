'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { userAPI, skillAPI, swapAPI } from '@/utils/api';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [requests, setRequests] = useState([]);
  const [incomingCount, setIncomingCount] = useState(0);
  const [error, setError] = useState('');
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        try {
          const profile = await userAPI.getProfile(user.id);
          setUserProfile(profile);

          const userSkills = await skillAPI.getUserSkills(user.id);
          setSkills(userSkills);

          // Fetch requests to count incoming
          const result = await swapAPI.getUserRequests(user.id);
          const incoming = result.incoming || [];
          setRequests(incoming);
          setIncomingCount(incoming.length);
        } catch (err) {
          setError(err.message || 'Failed to load profile');
        } finally {
          setPageLoading(false);
        }
      };

      fetchData();
    }
  }, [user]);

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
          <h1 className="text-2xl font-bold text-indigo-600">SkillSwap</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">{user?.first_name} {user?.last_name}</span>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                router.push('/login');
              }}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white rounded-lg p-8 mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome, {user?.first_name}! 👋</h2>
          <p className="text-indigo-100">{userProfile?.college_name} • Year {userProfile?.year_of_study}</p>
        </div>

        <div className="mb-8">
          <Link
            href="/profile/edit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition inline-block"
          >
            ✏️ Edit Profile
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Skills Added</p>
                <p className="text-3xl font-bold text-indigo-600">{skills.length}</p>
              </div>
              <div className="text-4xl">🎯</div>
            </div>
            <Link href="/skills" className="text-indigo-600 text-sm mt-4 inline-block hover:underline">
              Manage Skills →
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Your Rating</p>
                <p className="text-3xl font-bold text-yellow-500">{userProfile?.rating || 'N/A'}</p>
              </div>
              <div className="text-4xl">⭐</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Incoming Requests</p>
                <p className="text-3xl font-bold text-emerald-600">{incomingCount}</p>
              </div>
              <div className="text-4xl">📋</div>
            </div>
            <Link href="/requests" className="text-indigo-600 text-sm mt-4 inline-block hover:underline">
              View Requests →
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800">Your Skills</h3>
            <Link href="/skills" className="text-indigo-600 hover:text-indigo-700 font-medium">
              + Add Skill
            </Link>
          </div>

          {skills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skills.map((skill) => (
                <div key={skill.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{skill.skill_name}</h4>
                      <p className="text-sm text-gray-500">{skill.category}</p>
                    </div>
                    <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                      {skill.proficiency_level}
                    </span>
                  </div>
                  <div className="flex gap-2 text-sm">
                    {skill.can_teach && (
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded">
                        Can Teach
                      </span>
                    )}
                    {skill.wants_to_learn && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Want to Learn
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No skills added yet</p>
              <Link href="/skills" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Add Your First Skill
              </Link>
            </div>
          )}
        </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Link href="/explore" className="bg-indigo-600 text-white rounded-lg p-6 hover:bg-indigo-700 transition">
            <h4 className="text-lg font-bold mb-2">🔍 Explore Skills</h4>
            <p className="text-indigo-100">Browse available skills</p>
          </Link>

          <Link href="/students" className="bg-blue-600 text-white rounded-lg p-6 hover:bg-blue-700 transition">
            <h4 className="text-lg font-bold mb-2">👥 Browse Students</h4>
            <p className="text-blue-100">View other students' profiles</p>
          </Link>

          <Link href="/requests" className="bg-emerald-600 text-white rounded-lg p-6 hover:bg-emerald-700 transition">
            <h4 className="text-lg font-bold mb-2">📋 My Requests</h4>
            <p className="text-emerald-100">Manage skill exchange requests</p>
          </Link>

          <Link href="/sessions" className="bg-purple-600 text-white rounded-lg p-6 hover:bg-purple-700 transition">
            <h4 className="text-lg font-bold mb-2">📅 Sessions</h4>
            <p className="text-purple-100">Schedule & manage learning sessions</p>
          </Link>
        </div>
      </div>
    </div>
  );
}