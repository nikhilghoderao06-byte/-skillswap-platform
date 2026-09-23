'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { userAPI, skillAPI, swapAPI, reviewAPI } from '@/utils/api';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.id;

  const [profile, setProfile] = useState(null);
  const [userSkills, setUserSkills] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [skillTeach, setSkillTeach] = useState('');
  const [skillLearn, setSkillLearn] = useState('');
  const [mode, setMode] = useState('online');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (String(user?.id) === String(userId)) {
      router.push('/dashboard');
    }
  }, [user, userId, router]);

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        try {
          // Fetch profile
          const profileData = await userAPI.getProfile(userId);
          setProfile(profileData);

          // Fetch user skills
          const skills = await skillAPI.getUserSkills(userId);
          setUserSkills(skills);

          // Fetch all skills for dropdown
          const allSkillsData = await skillAPI.getAllSkills();
          setAllSkills(allSkillsData);

          // Fetch reviews - handle gracefully if none exist
          try {
            const reviewsData = await reviewAPI.getUserReviews(userId);
            setReviews(reviewsData);
          } catch (err) {
            // No reviews yet - that's OK
            setReviews([]);
          }
        } catch (err) {
          setError(err.message || 'Failed to load profile');
        } finally {
          setPageLoading(false);
        }
      };

      fetchData();
    }
  }, [user, userId]);

  const handleSendRequest = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setSubmitting(true);

    try {
      // Only skillLearn is REQUIRED
      if (!skillLearn) {
        setError('Please select a skill you want to learn from them');
        setSubmitting(false);
        return;
      }

      const requestData = {
        provider_id: parseInt(userId),
        skill_teach_id: skillTeach ? parseInt(skillTeach) : null,
        skill_learn_id: parseInt(skillLearn),
        mode,
        message,
      };

      console.log('Sending request:', requestData);

      await swapAPI.createRequest(requestData);

      // Reset form
      setSkillTeach('');
      setSkillLearn('');
      setMode('online');
      setMessage('');
      setShowRequestForm(false);
      setSuccessMessage('✅ Request sent successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to send request');
    } finally {
      setSubmitting(false);
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Profile not found</p>
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 px-4 py-3 rounded bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 px-4 py-3 rounded bg-green-50 border border-green-200 text-green-700">
            {successMessage}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{profile.first_name} {profile.last_name}</h1>
              <p className="text-gray-600">{profile.college_name} • Year {profile.year_of_study}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-yellow-500">⭐ {profile.rating || 'N/A'}</div>
              <p className="text-gray-600 text-sm">Overall Rating</p>
            </div>
          </div>

          {profile.bio && (
            <div className="bg-gray-50 rounded p-4 mb-6">
              <p className="text-gray-700">{profile.bio}</p>
            </div>
          )}

          <button
            onClick={() => setShowRequestForm(!showRequestForm)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition"
          >
            {showRequestForm ? '✕ Cancel Request' : '📧 Send Skill Exchange Request'}
          </button>
        </div>

        {showRequestForm && (
          <div className="bg-white rounded-lg shadow p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Send Skill Exchange Request</h2>

            <form onSubmit={handleSendRequest}>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">
                  Skill you want to teach them <span className="text-gray-500 text-sm">(Optional)</span>
                </label>
                <select
                  value={skillTeach}
                  onChange={(e) => setSkillTeach(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select a skill (leave blank if not applicable) --</option>
                  {allSkills && allSkills.length > 0 ? (
                    allSkills.map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.skill_name} ({skill.category})
                      </option>
                    ))
                  ) : (
                    <option disabled>No skills available</option>
                  )}
                </select>
                <p className="text-xs text-gray-500 mt-1">You will offer to teach them this skill</p>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">
                  Skill you want to learn from them <span className="text-red-500">*</span>
                </label>
                <select
                  value={skillLearn}
                  onChange={(e) => setSkillLearn(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- Select a skill you want to learn --</option>
                  {allSkills && allSkills.length > 0 ? (
                    allSkills.map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.skill_name} ({skill.category})
                      </option>
                    ))
                  ) : (
                    <option disabled>No skills available</option>
                  )}
                </select>
                <p className="text-xs text-gray-500 mt-1">They will teach you this skill (Required)</p>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">
                  Preferred Mode
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="online">🌐 Online</option>
                  <option value="offline">📍 Offline</option>
                  <option value="hybrid">🔄 Hybrid (Both)</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add any additional message or introduce yourself..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows="4"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition disabled:opacity-50"
              >
                {submitting ? '⏳ Sending Request...' : '✉️ Send Request'}
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Skills</h2>

          {userSkills && userSkills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userSkills.map((skill) => (
                <div key={skill.id} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900">{skill.skill_name}</h4>
                  <p className="text-sm text-gray-600">{skill.category}</p>
                  <div className="flex gap-2 mt-3">
                    {skill.can_teach && (
                      <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded">
                        ✓ Can Teach
                      </span>
                    )}
                    {skill.wants_to_learn && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        📚 Want to Learn
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {skill.proficiency_level} • {skill.experience_years || 0} years experience
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No skills added yet</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Reviews</h2>

          {reviews && reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-900">{review.first_name} {review.last_name}</h4>
                    <span className="text-yellow-500">{'⭐'.repeat(review.rating)}</span>
                  </div>
                  <p className="text-gray-700">{review.feedback}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No reviews yet</p>
          )}
        </div>
      </div>
    </div>
  );
}