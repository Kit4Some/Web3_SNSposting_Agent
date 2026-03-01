import { Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import NewsPage from './pages/NewsPage';
import PostsPage from './pages/PostsPage';
import SettingsPage from './pages/SettingsPage';
import { SessionsPage } from './pages/SessionsPage';

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/posts" element={<PostsPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </MainLayout>
  );
}

export default App;
