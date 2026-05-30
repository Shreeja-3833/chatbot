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
    <div className="flex flex-col">
      <h4>Register</h4>
      <label>Username</label>
      <input
        type="text"
        value={user.username}
        onChange={(e) => setUser({ ...user, username: e.target.value })}
        placeholder="Type a message..."
        className="flex-1 px-3.5 py-2.5 rounded-3xl border border-[#ddd] outline-none text-sm bg-[#f0f2f5] text-black"
      />
      <label>Password</label>
      <input
        type="password"
        value={user.password}
        onChange={(e) => setUser({ ...user, password: e.target.value })}
        placeholder="Type a message..."
        className="flex-1 px-3.5 py-2.5 rounded-3xl border border-[#ddd] outline-none text-sm bg-[#f0f2f5] text-black"
      />
      <button
        className="px-5 py-2.5 rounded-3xl bg-[#007bff] text-white border-none font-semibold text-sm"
        onClick={handleRegister}
      >
        Register
      </button>
    </div>
  );
};
