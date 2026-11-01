import { DashboardLayout } from './components/layout/DashboardLayout';
import { ToastContainer } from './components/notifications/ToastContainer';
import { useFirestoreSync } from './hooks/useFirestoreSync';

export default function App() {
  useFirestoreSync();

  return (
    <>
      <DashboardLayout />
      <ToastContainer />
    </>
  );
}
