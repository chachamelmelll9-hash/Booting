import { useBridge } from '../features/session';
import { AppRoutes } from './routes';

export function App() {
  // Bridge 리스너 초기화
  useBridge();

  return <AppRoutes />;
}

export default App;
