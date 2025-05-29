import React, {useState} from "react";
import {useNavigate} from "react-router-dom";
import {api} from "../../api";
import styles from "./Login.module.css";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleLogin() {
    try {
      const {token, user_id} = await api("/login/", {
        method: "POST",
        body: {username, password}
      });

      if (token && user_id) {
        localStorage.setItem("token", token);
        localStorage.setItem("user_id", user_id);
        navigate("/home");
      } else throw "user does not exist";

    } catch (err) {
      setError(err.message || "Invalid username or password");
    }
  }

  return (
    <div className={styles.loginPage}>
      <h1>TRAVEL PLANNER</h1>
      <div className={styles.loginContainer}>
        <h2>LOG IN</h2>
        
        <p>Username</p>
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username" />

        <p>Password</p>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" />

        {error && <div className="error"><p>{error}</p></div>}

        <button className="btn" onClick={handleLogin}>Log in</button>
      </div>
    </div>
  );
}