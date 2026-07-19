import { Navigate } from 'react-router-dom';
import { getLastView } from '../utils/lastView';
import { yearPath } from '../utils/navigation';

export function RootRedirect() {
  const target = getLastView() ?? yearPath(new Date().getFullYear());
  return <Navigate to={target} replace />;
}
