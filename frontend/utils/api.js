const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

const userAPI = {
  register: async (userData) => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Registration failed');
    return response.json();
  },

  login: async (email, password) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw new Error('Login failed');
    return response.json();
  },

  getProfile: async (userId) => {
    const response = await fetch(`${API_URL}/api/users/${userId}`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json();
  },

  updateProfile: async (userId, data) => {
    const response = await fetch(`${API_URL}/api/users/${userId}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update profile');
    return response.json();
  },

  getAllUsers: async () => {
    const response = await fetch(`${API_URL}/api/users`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },
};

const skillAPI = {
  getAllSkills: async () => {
    const response = await fetch(`${API_URL}/api/skills`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to fetch skills');
    return response.json();
  },

  getUserSkills: async (userId) => {
    const response = await fetch(`${API_URL}/api/skills/user/${userId}`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to fetch user skills');
    return response.json();
  },

  addUserSkill: async (skillData) => {
    const response = await fetch(`${API_URL}/api/skills/add`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(skillData),
    });
    if (!response.ok) throw new Error('Failed to add skill');
    return response.json();
  },

  removeUserSkill: async (skillId) => {
    const response = await fetch(`${API_URL}/api/skills/${skillId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to remove skill');
    return response.json();
  },
};

const swapAPI = {
  createRequest: async (data) => {
    const response = await fetch(`${API_URL}/api/swaps/request`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create request');
    return response.json();
  },

  getUserRequests: async (userId) => {
    const response = await fetch(`${API_URL}/api/swaps/user/${userId}`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to fetch requests');
    return response.json();
  },

  acceptRequest: async (requestId) => {
    const response = await fetch(`${API_URL}/api/swaps/${requestId}/accept`, {
      method: 'PUT',
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to accept request');
    return response.json();
  },

  rejectRequest: async (requestId) => {
    const response = await fetch(`${API_URL}/api/swaps/${requestId}/reject`, {
      method: 'PUT',
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to reject request');
    return response.json();
  },
};

const reviewAPI = {
  getUserReviews: async (userId) => {
    const response = await fetch(`${API_URL}/api/reviews/user/${userId}`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to fetch reviews');
    return response.json();
  },

  createReview: async (reviewData) => {
    try {
      console.log('Creating review with data:', reviewData);

      const response = await fetch(`${API_URL}/api/reviews`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(reviewData),
      });

      console.log('Review API response status:', response.status);

      const data = await response.json();
      console.log('Review API response data:', data);

      if (!response.ok) {
        const errorMsg = data.error || data.message || 'Failed to create review';
        throw new Error(errorMsg);
      }

      return data;
    } catch (error) {
      console.error('Review creation error:', error.message);
      throw error;
    }
  },
};

const sessionAPI = {
  createSession: async (sessionData) => {
    try {
      const response = await fetch(`${API_URL}/api/sessions`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(sessionData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create session');
      }
      
      return data;
    } catch (error) {
      console.error('Session creation error:', error);
      throw error;
    }
  },

  getUserSessions: async (userId) => {
    try {
      const response = await fetch(`${API_URL}/api/sessions/user/${userId}`, {
        headers: getAuthHeader(),
      });
      
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    } catch (error) {
      console.error('Get sessions error:', error);
      throw error;
    }
  },

  getSession: async (sessionId) => {
    try {
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
        headers: getAuthHeader(),
      });
      
      if (!response.ok) throw new Error('Failed to fetch session');
      return response.json();
    } catch (error) {
      console.error('Get session error:', error);
      throw error;
    }
  },

  completeSession: async (sessionId) => {
    try {
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}/complete`, {
        method: 'PUT',
        headers: getAuthHeader(),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete session');
      }
      
      return data;
    } catch (error) {
      console.error('Complete session error:', error);
      throw error;
    }
  },

  cancelSession: async (sessionId) => {
    try {
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}/cancel`, {
        method: 'PUT',
        headers: getAuthHeader(),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel session');
      }
      
      return data;
    } catch (error) {
      console.error('Cancel session error:', error);
      throw error;
    }
  },
};

export { userAPI as authAPI, userAPI, skillAPI, swapAPI, reviewAPI, sessionAPI };