import { Navigate } from 'react-router-dom';
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility';

interface FeatureGateProps {
  visKey: string;
  redirectTo: string;
  children: React.ReactNode;
}

/**
 * Wraps a route element and redirects to `redirectTo` if the
 * visibility key is set to false in the settings table.
 * This prevents direct URL access to disabled features.
 */
const FeatureGate: React.FC<FeatureGateProps> = ({ visKey, redirectTo, children }) => {
  const { isVisible, loading } = useFeatureVisibility();

  if (loading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isVisible(visKey)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default FeatureGate;
