import type { StudentProfile, ConceptMap, ClaimedIssue } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface StudentDataResponse {
  profile: StudentProfile;
  conceptMap: ConceptMap;
  claimedIssue: ClaimedIssue | null;
}

export const getStudentData = async (studentId: string, accessToken: string): Promise<StudentDataResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/api/student/${studentId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch student data:', error);
    throw error;
  }
};

export const updateStudentProfile = async (studentId: string, accessToken: string, profileData: any): Promise<void> => {
  try {
    const response = await fetch(`${BASE_URL}/api/student/${studentId}/profile`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}` 
      },
      body: JSON.stringify(profileData),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  } catch (error) {
    console.error('Failed to update student profile:', error);
    throw error;
  }
};

export const sendMessage = async (studentId: string, accessToken: string, message: string, repoUrl: string): Promise<string> => {
  try {
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}` 
      },
      body: JSON.stringify({ studentId, message, repoUrl }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.response || data.message || '';
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
};

export const claimIssue = async (studentId: string, accessToken: string, issueId: string): Promise<void> => {
  try {
    const response = await fetch(`${BASE_URL}/api/claim`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ studentId, issueId }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  } catch (error) {
    console.error('Failed to claim issue:', error);
    throw error;
  }
};

export const releaseIssue = async (studentId: string, accessToken: string, issueId: string): Promise<void> => {
  try {
    const response = await fetch(`${BASE_URL}/api/release`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ studentId, issueId }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  } catch (error) {
    console.error('Failed to release issue:', error);
    throw error;
  }
};

// Returns any[] since no specific interface was requested for recommended issues
export const getRecommendedIssues = async (studentId: string, accessToken: string): Promise<any[]> => {
  try {
    const response = await fetch(`${BASE_URL}/api/issues/${studentId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch recommended issues:', error);
    throw error;
  }
};

export const solveIssue = async (studentId: string, accessToken: string, issueId: string, prUrl: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${BASE_URL}/api/solve`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ studentId, issueId, prUrl }),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`API Call Failed: POST /api/solve returned ${response.status}`, errorBody);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to solve issue:', error);
    throw error;
  }
};
