import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useCookies } from "react-cookie";
import api from "apiClient";
import loadOrbitron from "components/fonts/loadOrbitron";
import "components/holo/holo.css";
import "./Admin.css";

// The frame round every admin page: home link, the admin nav with sign out,
// and the page's heading (kicker, title and any actions beside it).

const AdminLayout = ({ kicker, title, actions, children }) => {
  const [, , removeCookie] = useCookies(["loggedIn"]);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    loadOrbitron();
    document.documentElement.classList.add("admin-html");
    document.body.classList.add("admin-body");
    return () => {
      document.documentElement.classList.remove("admin-html");
      document.body.classList.remove("admin-body");
    };
  }, []);

  const signOut = () => {
    setSigningOut(true);
    const done = () => {
      removeCookie("loggedIn", { path: "/" });
      window.location.assign("/");
    };
    api({ method: "POST", url: "/logout" }).then(done, done);
  };

  return (
    <div className="admin holo-ui">
      <header className="admin-header">
        <a className="admin-home" href="/">
          <span aria-hidden="true">&lsaquo;</span> Marco Lavielle
        </a>
        <nav className="admin-nav" aria-label="Admin">
          <NavLink to="/admin/dashboard" className="admin-nav-link" activeClassName="is-active">
            Dashboard
          </NavLink>
          <NavLink exact to="/admin/post" className="admin-nav-link" activeClassName="is-active">
            New post
          </NavLink>
          <NavLink exact to="/admin/client" className="admin-nav-link" activeClassName="is-active">
            New client
          </NavLink>
          <button
            type="button"
            className={signingOut ? "holo-button is-quiet is-small is-busy" : "holo-button is-quiet is-small"}
            onClick={signOut}
            disabled={signingOut}
          >
            Sign out
          </button>
        </nav>
      </header>

      <main className="admin-main">
        <div className="admin-heading">
          <div>
            {kicker && <p className="holo-kicker">{kicker}</p>}
            <h1 className="holo-title admin-title">{title}</h1>
          </div>
          {actions && <div className="admin-heading-actions">{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  );
};

// "2020-03-12T..." -> "12 Mar 2020"
export const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
};

// a failed save or delete, in words
export const describeError = (err) => {
  const status = err && err.response && err.response.status;
  if (status === 403 || status === 401) return "Your session has ended. Sign in again to save.";
  return "Couldn't reach the server. Try again.";
};

export default AdminLayout;
