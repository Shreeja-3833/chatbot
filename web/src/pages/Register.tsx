import axios from "axios";
import { useState } from "react";
import { API_URL } from "../utils/constants";
import { useNavigate } from "react-router-dom";

export const Register = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState({ username: "", password: "" });
  const handleRegister = async () => {
    const res = await axios.post(API_URL + "create_user", user);
    try {
      if (res.data.status_code = 200) {
      navigate("/login"); 
    }
    } catch (err) {
      console.error(err, "something went wrong");
    }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <h4>Register</h4>
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
        onClick={handleRegister}
      >
        Register
      </button>
    </div>
  );
};
