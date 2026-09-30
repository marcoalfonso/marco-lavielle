import React, { Component } from "react";
import { Link, withRouter } from "react-router-dom";
import { connect } from "react-redux";

import { getPosts, getClients, deleteClient, deletePost } from "actions/appActions";
import HoloPanel from "components/holo/HoloPanel";
import AdminLayout, { describeError, formatDate } from "./AdminLayout";

const newestFirst = (list) =>
  (list || []).slice().sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));

const pad = (n) => String(n).padStart(2, "0");

// Delete asks twice: the first click arms it ("Confirm"), a second within a
// few seconds deletes.
class DeleteButton extends Component {
  state = { armed: false, busy: false };

  componentWillUnmount() {
    clearTimeout(this.timer);
  }

  onClick = () => {
    if (!this.state.armed) {
      this.setState({ armed: true });
      this.timer = setTimeout(() => this.setState({ armed: false }), 3500);
      return;
    }
    clearTimeout(this.timer);
    this.setState({ busy: true });
    this.props.onDelete().catch(() => this.setState({ busy: false, armed: false }));
  };

  render() {
    const { armed, busy } = this.state;
    return (
      <button
        type="button"
        className={`holo-button is-danger is-small${armed ? " is-armed" : ""}${busy ? " is-busy" : ""}`}
        onClick={this.onClick}
        disabled={busy}
        aria-label={armed ? `Confirm delete ${this.props.name}` : `Delete ${this.props.name}`}
      >
        {armed ? "Confirm" : "Delete"}
      </button>
    );
  }
}

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

export class Dashboard extends Component {
  state = { message: null };

  componentDidMount() {
    this.props.getPosts();
    this.props.getClients();
  }

  remove = (action, item) =>
    action(item._id).catch((err) => {
      this.setState({ message: describeError(err) });
      throw err;
    });

  render() {
    const { posts, clients } = this.props;
    const { message } = this.state;
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
              onDelete={(post) => this.remove(this.props.deletePost, post)}
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
              onDelete={(client) => this.remove(this.props.deleteClient, client)}
            />
          </HoloPanel>
        </div>
      </AdminLayout>
    );
  }
}

const mapStateToProps = (state) => ({
  posts: state.app.posts,
  clients: state.app.clients,
});

const mapDispatchToProps = (dispatch) => ({
  getPosts: () => dispatch(getPosts()),
  getClients: () => dispatch(getClients()),
  deletePost: (id) => dispatch(deletePost(id)),
  deleteClient: (id) => dispatch(deleteClient(id)),
});

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(Dashboard));
