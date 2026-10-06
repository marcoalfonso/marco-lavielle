import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { getPosts, getClients, deleteClient, deletePost } from "actions/appActions";
import HoloPanel from "components/holo/HoloPanel";
import AdminLayout, { describeError, formatDate } from "./AdminLayout";

const newestFirst = (list) =>
  (list || []).slice().sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));

const pad = (n) => String(n).padStart(2, "0");

// Delete asks twice: the first click arms it ("Confirm"), a second within a
// few seconds deletes.
const DeleteButton = ({ name, onDelete }) => {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onClick = () => {
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 3500);
      return;
    }
    clearTimeout(timer.current);
    setBusy(true);
    onDelete().catch(() => {
      setBusy(false);
      setArmed(false);
    });
  };

  return (
    <button
      type="button"
      className={`holo-button is-danger is-small${armed ? " is-armed" : ""}${busy ? " is-busy" : ""}`}
      onClick={onClick}
      disabled={busy}
      aria-label={armed ? `Confirm delete ${name}` : `Delete ${name}`}
    >
      {armed ? "Confirm" : "Delete"}
    </button>
  );
};

const ItemList = ({ items, empty, viewHref, editHref, onDelete, nameOf }) => {
  if (!items) return <p className="admin-empty">Loading…</p>;
  if (!items.length) return <p className="admin-empty">{empty}</p>;
  return (
    <ul className="admin-list">
      {items.map((item) => (
        <li key={item._id} className="admin-row">
          <div className="admin-row-main">
            <a className="admin-row-title" href={viewHref(item)}>
              {nameOf(item)}
            </a>
            <span className="admin-row-date">{formatDate(item.published)}</span>
          </div>
          <div className="admin-row-actions">
            <Link className="holo-button is-quiet is-small" to={editHref(item)}>
              Edit
            </Link>
            <DeleteButton name={nameOf(item)} onDelete={() => onDelete(item)} />
          </div>
        </li>
      ))}
    </ul>
  );
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const posts = useSelector((state) => state.app.posts);
  const clients = useSelector((state) => state.app.clients);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    dispatch(getPosts());
    dispatch(getClients());
  }, [dispatch]);

  const remove = (action, item) =>
    dispatch(action(item._id)).catch((err) => {
      setMessage(describeError(err));
      throw err;
    });

  return (
    <AdminLayout kicker="Admin" title="Dashboard">
      {message && (
        <p className="admin-message" role="alert">
          {message}
        </p>
      )}
      <div className="admin-grid">
        <HoloPanel className="admin-panel">
          <header className="admin-panel-head">
            <h2 className="admin-panel-title">
              Posts <span className="admin-count">{posts ? pad(posts.length) : "··"}</span>
            </h2>
            <Link className="holo-button is-small" to="/admin/post">
              New post
            </Link>
          </header>
          <ItemList
            items={posts && newestFirst(posts)}
            empty="No posts yet."
            nameOf={(post) => post.title}
            viewHref={(post) => `/journal/${post.slug}`}
            editHref={(post) => `/admin/post/${post._id}`}
            onDelete={(post) => remove(deletePost, post)}
          />
        </HoloPanel>

        <HoloPanel className="admin-panel">
          <header className="admin-panel-head">
            <h2 className="admin-panel-title">
              Clients <span className="admin-count">{clients ? pad(clients.length) : "··"}</span>
            </h2>
            <Link className="holo-button is-small" to="/admin/client">
              New client
            </Link>
          </header>
          <ItemList
            items={clients && newestFirst(clients)}
            empty="No clients yet."
            nameOf={(client) => client.name}
            viewHref={() => "/software"}
            editHref={(client) => `/admin/client/${client._id}`}
            onDelete={(client) => remove(deleteClient, client)}
          />
        </HoloPanel>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
