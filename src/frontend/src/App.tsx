import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Disruptions from './pages/Disruptions';
import Shipments from './pages/Shipments';
import ShipmentDetail from './pages/ShipmentDetail';
import Fleet from './pages/Fleet';
import ColdChain from './pages/ColdChain';
import Copilot from './pages/Copilot';
import OperationsBrief from './pages/OperationsBrief';
import Scenarios from './pages/Scenarios';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="disruptions" element={<Disruptions />} />
          <Route path="shipments" element={<Shipments />} />
          <Route path="shipments/:id" element={<ShipmentDetail />} />
          <Route path="fleet" element={<Fleet />} />
          <Route path="cold-chain" element={<ColdChain />} />
          <Route path="copilot" element={<Copilot />} />
          <Route path="operations-brief" element={<OperationsBrief />} />
          <Route path="scenarios" element={<Scenarios />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
