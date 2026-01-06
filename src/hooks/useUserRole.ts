import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { UserRole } from '@/types';

export const useUserRole = (userId: string | undefined) => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchRole = async () => {
      try {
        const response = await api.getUser(userId);
        if (response.success && response.data) {
          setRole(response.data.role as UserRole);
      }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
      setIsLoading(false);
      }
    };

    fetchRole();
  }, [userId]);

  return { role, isLoading };
};
