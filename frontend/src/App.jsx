import { Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';

function useAuth() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  const login = (t) => {
    localStorage.setItem('token', t);
    setToken(t);
  };
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return { token, login, logout };
}

export default function App() {
  const auth = useAuth();

  return (
    <Routes>
      <Route path="/login" element={auth.token ? <Navigate to="/" /> : <Login onLogin={auth.login} />} />
      <Route
        path="/register"
        element={auth.token ? <Navigate to="/" /> : <Register onLogin={auth.login} />}
      />
      <Route path="/" element={auth.token ? <Dashboard onLogout={auth.logout} /> : <Navigate to="/login" />} />
    </Routes>
  );
}
