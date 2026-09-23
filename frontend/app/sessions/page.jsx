'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { sessionAPI, swapAPI, skillAPI, userAPI, reviewAPI } from '@/utils/api';
import Link from 'next/link';

export default function SessionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [sessions, setSessions] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [skills, setSkills] = useState([]);
  const [users, setUsers] = useState([]);

  // Schedule session modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [location, setLocation] = useState('');
  const [submittingSession, setSubmittingSession] = useState(false);

  // Review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingSessionId, setReviewingSessionId] = useState(null);
  const [reviewingUserId, setReviewingUserId] = useState(null);
  const [reviewingUserName, setReviewingUserName] = useState('');
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

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

      // Fetch sessions
      const sessionsData = await sessionAPI.getUserSessions(user.id);
      setSessions(sessionsData);

      // Fetch accepted requests (to schedule new sessions)
      const requestsData = await swapAPI.getUserRequests(user.id);
      const allAcceptedRequests = [
        ...(requestsData.incoming || []),
        ...(requestsData.outgoing || []),
      ].filter(r => r.status === 'accepted');

      // Filter out requests that already have sessions scheduled
      const sessionsRequestIds = sessionsData.map(s => s.swap_request_id);
      const pendingRequests = allAcceptedRequests.filter(
        req => !sessionsRequestIds.includes(req.id)
      );
      
      setPendingRequests(pendingRequests);

      // Fetch skills and users
      const allSkills = await skillAPI.getAllSkills();
      setSkills(allSkills);

      const allUsers = await userAPI.getAllUsers();
      setUsers(allUsers);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setPageLoading(false);
    }
  };

  const handleScheduleSession = async (e) => {
    e.preventDefault();
    setSubmittingSession(true);
    setError('');

    try {
      if (!scheduledDate || !scheduledTime) {
        setError('Please fill in date and time');
        setSubmittingSession(false);
        return;
      }

      await sessionAPI.createSession({
        swap_request_id: selectedRequestId,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        location,
      });

      setSuccessMessage('✅ Session scheduled successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);

      // Reset form
      setShowScheduleModal(false);
      setSelectedRequestId(null);
      setScheduledDate('');
      setScheduledTime('');
      setLocation('');

      // Refresh sessions
      await fetchData();
    } catch (err) {
      setError('Failed to schedule: ' + err.message);
    } finally {
      setSubmittingSession(false);
    }
  };

  const handleCompleteSession = async (sessionId, sessionData) => {
    // Only requester can complete and review
    if (sessionData.requester_id !== user.id) {
      setError('Only the requester can mark this session as complete');
      return;
    }

    if (!window.confirm('Mark this session as complete?')) {
      return;
    }

    setProcessingId(sessionId);
    setError('');

    try {
      await sessionAPI.completeSession(sessionId);
      setSuccessMessage('✅ Session completed!');
      setTimeout(() => setSuccessMessage(''), 3000);

      // ONLY requester leaves review for provider
      const otherUserId = sessionData.provider_id;
      const otherUserName = getUserName(otherUserId);
      
      setReviewingSessionId(sessionId);
      setReviewingUserId(otherUserId);
      setReviewingUserName(otherUserName);
      setShowReviewModal(true);
      setRating(5);
      setFeedback('');
      setReviewError('');

      // Refresh sessions
      await fetchData();
    } catch (err) {
      setError('Failed to complete session: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!feedback.trim()) {
      setReviewError('Please write some feedback');
      return;
    }

    setSubmittingReview(true);
    setReviewError('');

    try {
      console.log('Submitting review:', {
        reviewee_id: reviewingUserId,
        rating: parseInt(rating),
        feedback: feedback.trim(),
      });

      const response = await reviewAPI.createReview({
        reviewee_id: reviewingUserId,
        rating: parseInt(rating),
        feedback: feedback.trim(),
      });

      console.log('Review response:', response);

      setSuccessMessage('⭐ Review submitted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);

      // Reset review form
      setShowReviewModal(false);
      setReviewingSessionId(null);
      setReviewingUserId(null);
      setReviewingUserName('');
      setRating(5);
      setFeedback('');
      setReviewError('');

      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Review submission error:', err);
      setReviewError('Failed to submit review: ' + err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCancelSession = async (sessionId) => {
    if (!window.confirm('Cancel this session?')) {
      return;
    }

    setProcessingId(sessionId);
    setError('');

    try {
      await sessionAPI.cancelSession(sessionId);
      setSuccessMessage('❌ Session cancelled');
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchData();
    } catch (err) {
      setError('Failed to cancel: ' + err.message);
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

  const getOtherUserId = (session) => {
    return session.requester_id === user.id ? session.provider_id : session.requester_id;
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
            <Link href="/requests" className="text-gray-600 hover:text-gray-900">Requests</Link>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Learning Sessions</h1>

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

        {/* Schedule New Session Section */}
        {pendingRequests.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-blue-900 mb-4">📅 Schedule New Session</h2>
            <p className="text-blue-800 mb-4">
              You have {pendingRequests.length} accepted request(s) ready to schedule
            </p>
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div key={req.id} className="bg-white p-4 rounded flex justify-between items-center hover:shadow-md transition">
                  <div>
                    <p className="font-medium text-gray-900">
                      {getUserName(req.requester_id === user.id ? req.provider_id : req.requester_id)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Learn: {getSkillName(req.skill_learn_id)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedRequestId(req.id);
                      setShowScheduleModal(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                  >
                    📅 Schedule
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sessions List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Sessions</h2>

          {sessions.length > 0 ? (
            sessions.map((session) => {
              const otherUserId = getOtherUserId(session);
              const otherUserName = getUserName(otherUserId);
              const isCompleted = session.status === 'completed';
              const isPending = session.status === 'scheduled';
              const isRequester = session.requester_id === user.id;

              return (
                <div key={session.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{otherUserName}</h3>
                      <p className="text-sm text-gray-600">
                        {getSkillName(session.skill_teach_id)} ↔ {getSkillName(session.skill_learn_id)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {isRequester ? '(You are the requester)' : '(You are the provider)'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                      session.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      session.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded p-4 mb-4 space-y-2">
                    <p className="text-sm"><strong>📅 Date:</strong> {new Date(session.scheduled_date).toLocaleDateString()}</p>
                    <p className="text-sm"><strong>🕐 Time:</strong> {session.scheduled_time}</p>
                    <p className="text-sm"><strong>📍 Location:</strong> {session.location || 'TBD'}</p>
                    <p className="text-sm"><strong>💬 Mode:</strong> {session.mode}</p>
                  </div>

                  {isPending && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleCompleteSession(session.id, session)}
                        disabled={processingId === session.id || !isRequester}
                        className={`flex-1 px-4 py-2 text-white rounded font-medium transition ${
                          isRequester
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-gray-400 cursor-not-allowed'
                        } ${processingId === session.id ? 'opacity-50' : ''}`}
                        title={!isRequester ? 'Only the requester can mark complete' : ''}
                      >
                        {processingId === session.id ? '⏳ Processing...' : '✅ Complete'}
                      </button>
                      <button
                        onClick={() => handleCancelSession(session.id)}
                        disabled={processingId === session.id}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 font-medium"
                      >
                        {processingId === session.id ? '⏳ Processing...' : '❌ Cancel'}
                      </button>
                    </div>
                  )}

                  {isPending && !isRequester && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-4 mt-4">
                      <p className="text-blue-800 text-sm">
                        ℹ️ Waiting for {getUserName(session.requester_id)} to mark the session as complete and leave a review.
                      </p>
                    </div>
                  )}

                  {isCompleted && (
                    <div className="bg-green-50 border border-green-200 rounded p-4">
                      <p className="text-green-800 font-medium">✅ Session Completed</p>
                      <p className="text-sm text-green-700 mt-1">
                        {isRequester 
                          ? `You reviewed ${otherUserName} for teaching you ${getSkillName(session.skill_learn_id)}.`
                          : `${getUserName(session.requester_id)} reviewed you for teaching ${getSkillName(session.skill_teach_id)}.`
                        }
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500 text-lg">📭 No sessions yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Accept a skill exchange request to schedule your first session
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Session Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">📅 Schedule Learning Session</h2>

            <form onSubmit={handleScheduleSession}>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Date *</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Time *</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">Location (Optional)</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Meeting location or video call link"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSession}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
                >
                  {submittingSession ? '⏳ Scheduling...' : '📅 Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">⭐ Leave a Review</h2>
            <p className="text-gray-600 mb-6">
              How was your session with <strong>{reviewingUserName}</strong>?
            </p>

            <form onSubmit={handleSubmitReview}>
              {/* Rating Stars */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">Rating</p>
                <div className="flex gap-2 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-4xl transition cursor-pointer ${
                        star <= rating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  {rating === 1 && '⭐ Poor'}
                  {rating === 2 && '⭐⭐ Fair'}
                  {rating === 3 && '⭐⭐⭐ Good'}
                  {rating === 4 && '⭐⭐⭐⭐ Very Good'}
                  {rating === 5 && '⭐⭐⭐⭐⭐ Excellent'}
                </p>
              </div>

              {/* Feedback Text */}
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">Your Feedback *</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share your experience with this student..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows="4"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {feedback.length} characters entered
                </p>
              </div>

              {/* Error Message */}
              {reviewError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                  ⚠️ {reviewError}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowReviewModal(false);
                    setFeedback('');
                    setReviewError('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
                >
                  {submittingReview ? '⏳ Submitting...' : '⭐ Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}