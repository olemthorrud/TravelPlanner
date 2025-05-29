// Simple wrapper for all requests
export const base = "http://127.0.0.1:8000/api";

export function getToken() {
  return localStorage.getItem("token");  // will be null if not logged in
}

export async function api(path, {method = "GET", body = null} = {}) {
  const opts = {method, headers: {}};
  if (body) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const token = getToken();
  if (token) opts.headers["Authorization"] = `Token ${token}`;

  const res = await fetch(`${base}${path}`, opts);
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null; //to handle deletions
}
//ole