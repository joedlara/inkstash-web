import "uno.css"
import { createRoot } from "react-dom/client"

import { Provider } from "react-redux"
import { store } from "./app/store"

import { BrowserRouter, Routes, Route } from "react-router-dom"
import CreatorDashboard from "./pages/CreatorDashboard"
import Profile from "./pages/Profile"
import Home from "./pages/Home"
import Auctions from "./pages/Auctions"

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<CreatorDashboard />} />
        <Route path="/profile/" element={<Profile />} />
        <Route path="/auctions" element={<Auctions />} />
      </Routes>
    </BrowserRouter>
  </Provider>
)
