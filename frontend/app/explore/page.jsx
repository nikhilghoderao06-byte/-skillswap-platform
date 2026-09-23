'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { skillAPI } from '@/utils/api';
import Link from 'next/link';

export default function ExplorePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [skills, setSkills] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      const fetchSkills = async () => {
        try {
          const allSkills = await skillAPI.getAllSkills();
          setSkills(allSkills);
        } catch (err) {
          setError(err.message || 'Failed to load skills');
        } finally {
          setPageLoading(false);
        }
      };

      fetchSkills();
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
          <Link href="/dashboard" className="text-2xl font-bold text-indigo-600">SkillSwap</Link>
          <div className="flex gap-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
            <Link href="/students" className="text-gray-600 hover:text-gray-900">Students</Link>
            <button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); router.push('/login'); }} className="text-gray-600 hover:text-gray-900">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Explore Skills</h1>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => (
            <div key={skill.id} className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition">
              <h5 className="font-bold text-gray-900">{skill.skill_name}</h5>
              <p className="text-sm text-gray-600">{skill.category}</p>
              {skill.description && <p className="text-xs text-gray-500 mt-2">{skill.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}