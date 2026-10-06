import React, { useEffect, useState } from "react";
import { Link, useHistory, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { createPost, editPost, getPost } from "actions/appActions";
import HoloPanel from "components/holo/HoloPanel";
import AdminLayout, { describeError } from "../AdminLayout";
import RichTextEditor from "../RichTextEditor";

const EMPTY = { title: "", subtitle: "", author: "", body: "" };

// the editor leaves markup like "<p><br></p>" when emptied
const isBlankHtml = (html) => !html || !html.replace(/<(?!img|iframe)[^>]*>|&nbsp;|\s/gi, "");

const EditPost = () => {
  const { id } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const post = useSelector((state) => state.app.post);
  const [values, setValues] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  // the post being edited (and another one when the address changes: start over)
  useEffect(() => {
    setValues(EMPTY);
    setLoaded(false);
    setErrors({});
    setMessage(null);
    setSaving(false);
    if (id) dispatch(getPost(id)).catch((err) => setMessage(describeError(err)));
  }, [id]);

  // fill the form once the post being edited has arrived
  useEffect(() => {
    if (id && !loaded && post && post._id === id) {
      setLoaded(true);
      setValues({
        title: post.title || "",
        subtitle: post.subtitle || "",
        author: post.author || "",
        body: post.body || "",
      });
    }
  }, [id, loaded, post]);

  const set = (name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((errs) => ({ ...errs, [name]: null }));
  };

  const onChange = (e) => set(e.target.name, e.target.value);

  const onSubmit = (e) => {
    e.preventDefault();
    if (saving) return;
    const found = {};
    if (!values.title.trim()) found.title = "Title is required";
    if (!values.subtitle.trim()) found.subtitle = "Subtitle is required";
    if (!values.author.trim()) found.author = "Author is required";
    if (isBlankHtml(values.body)) found.body = "Write something first";
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    setSaving(true);
    setMessage(null);
    dispatch(id ? editPost({ ...values, _id: id }) : createPost(values))
      .then(() => history.push("/admin/dashboard"))
      .catch((err) => {
        setSaving(false);
        setMessage(describeError(err));
      });
  };

  const field = (name, label, props = {}) => (
    <label className={`holo-field${errors[name] ? " has-error" : ""}`}>
      <span className="holo-label">{label}</span>
      <input className="holo-input" name={name} value={values[name]} onChange={onChange} {...props} />
      {errors[name] && <span className="holo-error">{errors[name]}</span>}
    </label>
  );

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
          <form className="admin-form" onSubmit={onSubmit} noValidate>
            {field("title", "Title")}
            {field("subtitle", "Subtitle")}
            <div className="admin-form-row">{field("author", "Author", { autoComplete: "name" })}</div>
            <div className={`holo-field${errors.body ? " has-error" : ""}`}>
              <label className="holo-label" htmlFor="post-body">
                Body
              </label>
              <RichTextEditor id="post-body" value={values.body} onChange={(html) => set("body", html)} invalid={!!errors.body} />
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
};

export default EditPost;
