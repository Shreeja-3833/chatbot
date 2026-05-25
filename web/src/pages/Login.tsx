import axios from "axios";
import { useState } from "react";
import { API_URL } from "../utils/constants";
import { Link, useNavigate } from "react-router-dom";

export const Login = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState({ username: "", password: "" });
  const handleLogin = async () => {
    const res = await axios.post(API_URL + "login", user, {
      withCredentials: true,
    });
    try {
      if (res.data.status_code == 200) {
        navigate("/chat");
      }
    } catch (err) {
      console.error(err, "something went wrong");
    }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <h4>Login</h4>
      <label>Username</label>
      <input
        type="text"
        value={user.username}
        onChange={(e) => setUser({ ...user, username: e.target.value })}
        placeholder="Type a message..."
        style={{
          flex: 1,
          padding: "10px 14px",
          borderRadius: "24px",
          border: "1px solid #ddd",
          outline: "none",
          fontSize: "14px",
          background: "#f0f2f5",
          color: "black",
        }}
      />
      <label>Password</label>
      <input
        type="password"
        value={user.password}
        onChange={(e) => setUser({ ...user, password: e.target.value })}
        placeholder="Type a message..."
        style={{
          flex: 1,
          padding: "10px 14px",
          borderRadius: "24px",
          border: "1px solid #ddd",
          outline: "none",
          fontSize: "14px",
          background: "#f0f2f5",
          color: "black",
        }}
      />
      <button
        style={{
          padding: "10px 20px",
          borderRadius: "24px",
          background: "#007bff",
          color: "white",
          border: "none",
          fontWeight: 600,
          fontSize: "14px",
        }}
        onClick={handleLogin}
      >
        Login
      </button>

      <div style={{ display: "flex", flexDirection: "row" }}>
        <p>New user? </p>
        <Link to="/register">Register</Link>
      </div>
    </div>
  );
};
