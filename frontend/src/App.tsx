import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import InvoiceUpload from './pages/InvoiceUpload';
import InvoiceVerification from './pages/InvoiceVerification';
import InvoiceHistory from './pages/InvoiceHistory';
import InvoiceDetail from './pages/InvoiceDetail';
import AIAssistant from './pages/AIAssistant';
import MemoryExplorer from './pages/MemoryExplorer';
import Reports from './pages/Reports';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<InvoiceUpload />} />
        <Route path="/verify/:id" element={<InvoiceVerification />} />
        <Route path="/history" element={<InvoiceHistory />} />
        <Route path="/invoice/:id" element={<InvoiceDetail />} />
        <Route path="/assistant" element={<AIAssistant />} />
        <Route path="/memories" element={<MemoryExplorer />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
