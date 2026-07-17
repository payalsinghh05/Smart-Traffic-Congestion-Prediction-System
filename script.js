// script.js — Legacy auth helpers (index.html now uses inline JS)
// This file is kept for compatibility only.

const BASE_URL = "http://127.0.0.1:5000";

async function login() {
  const user = document.getElementById("username").value;
  const pass = document.getElementById("password").value;
  if (!user || !pass) { alert("Please enter both username and password"); return; }
  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, password: pass })
    });
    const result = await response.json();
    if (response.ok) {
      localStorage.setItem("user_id", result.user_id);
      localStorage.setItem("username", user);
      window.location.href = "dashboard.html";
    } else {
      alert("Login failed: " + result.message);
    }
  } catch (error) {
    alert("Backend Error: Make sure app.py is running!");
  }
}

async function register() {
  const user = document.getElementById("username").value;
  const pass = document.getElementById("password").value;
  if (!user || !pass) { alert("Please fill in both fields to register"); return; }
  try {
    const response = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, password: pass })
    });
    const result = await response.json();
    if (response.ok) {
      alert("Registration successful! Please login now.");
    } else {
      alert(result.message);
    }
  } catch (error) {
    alert("Backend Error: Make sure app.py is running!");
  }
}

function continueAsGuest() {
  localStorage.removeItem("user_id");
  localStorage.setItem("username", "Guest");
  window.location.href = "dashboard.html";
}
