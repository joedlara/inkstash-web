import 'uno.css';
import { createRoot } from 'react-dom/client';

import { Provider } from 'react-redux';
import { store } from './app/store';

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import UserDashboard from './pages/UserDashboard';
import Profile from './pages/Profile';
import Home from './pages/Home';
import Auctions from './pages/Auctions';
import Signup from './pages/Signup';
import NavBar from './components/main/NavBar';
import Footer from './components/main/Footer';
import CreateUsername from './pages/CreateUsername';
import EmailConfirmation from './pages/EmailConfirmation';

createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/profile/" element={<Profile />} />
        <Route path="/auctions" element={<Auctions />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/create-username" element={<CreateUsername />} />
        <Route path="/email-confirmation" element={<EmailConfirmation />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  </Provider>
);
