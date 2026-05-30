import { createBrowserRouter, Navigate } from "react-router-dom";
import Chat from "../pages/Chat";
import Dashboard from "../pages/Dashboard";
import { Login } from "../pages/Login";
import { Register } from "../pages/Register";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/chat" replace/>,
  },
  {
    path: "/chat",
    element: <Chat />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
]);
