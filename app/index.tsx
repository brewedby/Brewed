import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) return <LoadingSpinner message="Loading..." />;
  if (session) return <Redirect href="/(tabs)/dashboard" />;
  return <Redirect href="/(auth)/sign-in" />;
}
