'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { skillAPI } from '@/utils/api';
import Link from 'next/link';

export default function SkillsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userSkills, setUserSkills] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    skill_id: '',
    proficiency_level: 'Intermediate',
    can_teach: false,
    wants_to_learn: false,
    experience_years: 0,
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      const fetchSkills = async () => {
        try {
          const allSkillsData = await skillAPI.getAllSkills();
          setAllSkills(allSkillsData);

          const userSkillsData = await skillAPI.getUserSkills(user.id);
          setUserSkills(userSkillsData);
        } catch (err) {
          setError(err.message || 'Failed to load skills');
        } finally {
          setPageLoading(false);
        }
      };

      fetchSkills();
    }
  }, [user]);

  const handleAddSkill = async (e) => {
    e.preventDefault();

    if (!formData.skill_id) {
      alert('Please select a skill');
      return;
    }

    if (!formData.can_teach && !formData.wants_to_learn) {
      alert('Please select at least one: Can Teach or Want to Learn');
      return;
    }

    try {
      await skillAPI.addUserSkill({
        skill_id: parseInt(formData.skill_id),
        proficiency_level: formData.proficiency_level,
        can_teach: formData.can_teach,
        wants_to_learn: formData.wants_to_learn,
        experience_years: parseInt(formData.experience_years) || 0,
      });

      alert('Skill added successfully!');

      const updatedSkills = await skillAPI.getUserSkills(user.id);
      setUserSkills(updatedSkills);

      setFormData({
        skill_id: '',
        proficiency_level: 'Intermediate',
        can_teach: false,
        wants_to_learn: false,
        experience_years: 0,
      });
      setShowForm(false);
    } catch (err) {
      alert('Error: ' + err.message);
    }
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
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-indigo-600">
            SkillSwap
          </Link>
          <div className="flex gap-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
              Dashboard
            </Link>
            <Link href="/explore" className="text-gray-600 hover:text-gray-900">
              Explore
            </Link>
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Your Skills</h1>
          <p className="text-gray-600">Add the skills you can teach and want to learn</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Skills ({userSkills.length})</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition"
            >
              {showForm ? '✕ Close' : '+ Add Skill'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleAddSkill} className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Skill *
                  </label>
                  <select
                    value={formData.skill_id}
                    onChange={(e) =>
                      setFormData({ ...formData, skill_id: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Choose a skill...</option>
                    {allSkills.map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.skill_name} ({skill.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proficiency Level
                  </label>
                  <select
                    value={formData.proficiency_level}
                    onChange={(e) =>
                      setFormData({ ...formData, proficiency_level: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.experience_years}
                  onChange={(e) =>
                    setFormData({ ...formData, experience_years: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="mb-6 space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.can_teach}
                    onChange={(e) =>
                      setFormData({ ...formData, can_teach: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="ml-3 text-gray-700">I can teach this skill</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.wants_to_learn}
                    onChange={(e) =>
                      setFormData({ ...formData, wants_to_learn: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="ml-3 text-gray-700">I want to learn this skill</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition"
              >
                Add Skill
              </button>
            </form>
          )}

          {userSkills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userSkills.map((skill) => (
                <div key={skill.id} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-gray-900">{skill.skill_name}</h4>
                      <p className="text-sm text-gray-600">{skill.category}</p>
                    </div>
                    <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                      {skill.proficiency_level}
                    </span>
                  </div>

                  <div className="flex gap-2 mb-2">
                    {skill.can_teach && (
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded">
                        ✓ Can Teach
                      </span>
                    )}
                    {skill.wants_to_learn && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        ⚡ Want to Learn
                      </span>
                    )}
                  </div>

                  {skill.experience_years > 0 && (
                    <p className="text-xs text-gray-500">
                      {skill.experience_years} year{skill.experience_years > 1 ? 's' : ''} experience
                    </p>
                  )}

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => alert('Edit feature coming soon!')}
                      className="flex-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm('Delete this skill?')) {
                          try {
                            await skillAPI.removeUserSkill(skill.id);
                            const updated = await skillAPI.getUserSkills(user.id);
                            setUserSkills(updated);
                            alert('Skill deleted!');
                          } catch (err) {
                            alert('Error: ' + err.message);
                          }
                        }
                      }}
                      className="flex-1 text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-3">No skills added yet</p>
              <p className="text-sm text-gray-400">Click "Add Skill" to get started!</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Skills to Add</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allSkills.map((skill) => (
              <div key={skill.id} className="border border-gray-200 rounded-lg p-4">
                <h5 className="font-bold text-gray-900">{skill.skill_name}</h5>
                <p className="text-sm text-gray-600 mt-1">{skill.category}</p>
                {skill.description && (
                  <p className="text-xs text-gray-500 mt-2">{skill.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}