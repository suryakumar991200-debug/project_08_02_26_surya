import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Layout from './components/Layout';
import Upload from './pages/Upload';
import Chat from './pages/Chat';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Chat />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/documents" element={<Dashboard />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
