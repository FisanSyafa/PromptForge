import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import EndpointList from './pages/EndpointList';
import EndpointCreate from './pages/EndpointCreate';
import TestConsole from './pages/TestConsole';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/endpoints" element={<EndpointList />} />
          <Route path="/endpoints/create" element={<EndpointCreate />} />
          <Route path="/test" element={<TestConsole />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
