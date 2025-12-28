import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Editor } from './pages/Editor';
import { History } from './pages/History';

import { useEffect } from 'react';
import { usePluginStore } from './store/pluginStore';


function App() {
  const { registerPlugin } = usePluginStore();

  useEffect(() => {
    // Register Plugins
    // StatsPlugin removed
  }, [registerPlugin]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/diagram" element={<Editor />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
