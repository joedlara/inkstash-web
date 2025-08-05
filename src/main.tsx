import "uno.css"
import { createRoot } from "react-dom/client"

import { Provider } from "react-redux"
import { store } from "./app/store"

import { BrowserRouter, Routes, Route } from "react-router-dom"
import CreatorDashboard from "./pages/CreatorDashboard"
import Profile from "./pages/Profile"
import Home from "./pages/Home"
import Auctions from "./pages/Auctions"
import Signup from "./pages/Signup"
import NavBar from "./components/NavBar"
import Footer from "./components/Footer"
import CreateUsername from "./pages/CreateUsername"

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<CreatorDashboard />} />
        <Route path="/profile/" element={<Profile />} />
        <Route path="/auctions" element={<Auctions />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/create-username" element={<CreateUsername />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  </Provider>
)
