import { useState, useEffect, useCallback } from 'react';
import { getStudentData } from '../services/api';
import type { StudentDataResponse } from '../services/api';

export const useStudentData = (studentId: string, accessToken: string) => {
  const [data, setData] = useState<StudentDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const res = await getStudentData(studentId, accessToken);
      setData(res);
      setError(null);
    } catch (err: any) {
      if (!isSilent) setError(err.message || 'Failed to fetch data');
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [studentId, accessToken]);

  useEffect(() => {
    fetchData(); // Initial fetch
    
    // Poll every 30 seconds
    const interval = setInterval(() => {
      fetchData(true); 
    }, 30000); 

    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, isLoading, error, refresh: fetchData };
};
