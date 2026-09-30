import React, { Component } from "react";
import { Link, withRouter } from "react-router-dom";
import { connect } from "react-redux";
import { createPost, editPost, getPost } from "actions/appActions";
import HoloPanel from "components/holo/HoloPanel";
import AdminLayout, { describeError } from "../AdminLayout";
import RichTextEditor from "../RichTextEditor";

const EMPTY = { title: "", subtitle: "", author: "", body: "" };

// the editor leaves markup like "<p><br></p>" when emptied
const isBlankHtml = (html) => !html || !html.replace(/<(?!img|iframe)[^>]*>|&nbsp;|\s/gi, "");

export class EditPost extends Component {
  state = { values: EMPTY, loaded: false, errors: {}, message: null, saving: false };

  componentDidMount() {
    this.load();
  }

  load = () => {
    const { id } = this.props.match.params;
    if (id) this.props.getPost(id).catch((err) => this.setState({ message: describeError(err) }));
  };

  componentDidUpdate(prevProps) {
    const { id } = this.props.match.params;
    if (id !== prevProps.match.params.id) {
      // another post: start over
      this.setState({ values: EMPTY, loaded: false, errors: {}, message: null, saving: false }, this.load);
      return;
    }
    // fill the form once the post being edited has arrived
    const { post } = this.props;
    if (id && !this.state.loaded && post && post._id === id) {
      this.setState({
        loaded: true,
        values: {
          title: post.title || "",
          subtitle: post.subtitle || "",
          author: post.author || "",
          body: post.body || "",
        },
      });
    }
  }

  set = (name, value) =>
    this.setState(({ values, errors }) => ({ values: { ...values, [name]: value }, errors: { ...errors, [name]: null } }));

  onChange = (e) => this.set(e.target.name, e.target.value);

  onSubmit = (e) => {
    e.preventDefault();
    const { values, saving } = this.state;
    if (saving) return;
    const errors = {};
    if (!values.title.trim()) errors.title = "Title is required";
    if (!values.subtitle.trim()) errors.subtitle = "Subtitle is required";
    if (!values.author.trim()) errors.author = "Author is required";
    if (isBlankHtml(values.body)) errors.body = "Write something first";
    if (Object.keys(errors).length) {
      this.setState({ errors });
      return;
    }
    const { id } = this.props.match.params;
    this.setState({ saving: true, message: null });
    const save = id ? this.props.editPost({ ...values, _id: id }) : this.props.createPost(values);
    save
      .then(() => this.props.history.push("/admin/dashboard"))
      .catch((err) => this.setState({ saving: false, message: describeError(err) }));
  };

  field = (name, label, props = {}) => {
    const { values, errors } = this.state;
    return (
      <label className={`holo-field${errors[name] ? " has-error" : ""}`}>
        <span className="holo-label">{label}</span>
        <input className="holo-input" name={name} value={values[name]} onChange={this.onChange} {...props} />
        {errors[name] && <span className="holo-error">{errors[name]}</span>}
      </label>
    );
  };

  render() {
    const { id } = this.props.match.params;
    const { values, errors, message, saving, loaded } = this.state;
    const { post } = this.props;
    const waiting = id && !loaded;
    return (
      <AdminLayout
        kicker={id ? "Edit post" : "New post"}
        title={id ? values.title || "Post" : "Write a post"}
        actions={
          id && post && post.slug ? (
            <a className="holo-button is-quiet is-small" href={`/journal/${post.slug}`}>
              View post
            </a>
          ) : null
        }
      >
        <HoloPanel className="admin-panel admin-form-panel">
          {waiting ? (
            <p className="admin-empty">{message || "Loading…"}</p>
          ) : (
            <form className="admin-form" onSubmit={this.onSubmit} noValidate>
              {this.field("title", "Title")}
              {this.field("subtitle", "Subtitle")}
              <div className="admin-form-row">{this.field("author", "Author", { autoComplete: "name" })}</div>
              <div className={`holo-field${errors.body ? " has-error" : ""}`}>
                <label className="holo-label" htmlFor="post-body">
                  Body
                </label>
                <RichTextEditor id="post-body" value={values.body} onChange={(html) => this.set("body", html)} invalid={!!errors.body} />
                {errors.body && <span className="holo-error">{errors.body}</span>}
              </div>

              <div className="admin-form-actions">
                <button type="submit" className={saving ? "holo-button is-busy" : "holo-button"} disabled={saving}>
                  {saving ? "Saving" : id ? "Save changes" : "Publish"}
                </button>
                <Link className="holo-button is-quiet" to="/admin/dashboard">
                  Cancel
                </Link>
                <p className="admin-message" role="alert">
                  {message}
                </p>
              </div>
            </form>
          )}
        </HoloPanel>
      </AdminLayout>
    );
  }
}

const mapStateToProps = (state) => ({
  post: state.app.post,
});

const mapDispatchToProps = (dispatch) => ({
  createPost: (formData) => dispatch(createPost(formData)),
  editPost: (formData) => dispatch(editPost(formData)),
  getPost: (id) => dispatch(getPost(id)),
});

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(EditPost));
