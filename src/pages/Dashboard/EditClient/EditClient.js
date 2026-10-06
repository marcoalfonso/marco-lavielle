import React, { useEffect, useState } from "react";
import { Link, useHistory, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { createClient, editClient, getClient } from "actions/appActions";
import HoloPanel from "components/holo/HoloPanel";
import AdminLayout, { describeError } from "../AdminLayout";

const EMPTY = { name: "", tags: "", url: "", photo: "", description: "" };

// photos are saved relative to the Software page ("../images/…"); from an
// admin page that would point elsewhere, so preview them from the site root
const previewSrc = (photo) => photo.trim().replace(/^(\.\.\/)+/, "/");

const EditClient = () => {
  const { id } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const client = useSelector((state) => state.app.client);
  const [values, setValues] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [photoBroken, setPhotoBroken] = useState(false);

  // the client being edited (and another one when the address changes: start over)
  useEffect(() => {
    setValues(EMPTY);
    setLoaded(false);
    setErrors({});
    setMessage(null);
    setSaving(false);
    if (id) dispatch(getClient(id)).catch((err) => setMessage(describeError(err)));
  }, [id]);

  // fill the form once the client being edited has arrived
  useEffect(() => {
    if (id && !loaded && client && client._id === id) {
      const filled = {};
      Object.keys(EMPTY).forEach((key) => {
        filled[key] = client[key] || "";
      });
      setLoaded(true);
      setValues(filled);
    }
  }, [id, loaded, client]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((errs) => ({ ...errs, [name]: null }));
    if (name === "photo") setPhotoBroken(false);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (saving) return;
    if (!values.name.trim()) {
      setErrors({ name: "Name is required" });
      return;
    }
    setSaving(true);
    setMessage(null);
    dispatch(id ? editClient({ ...values, _id: id }) : createClient(values))
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
    <AdminLayout kicker={id ? "Edit client" : "New client"} title={id ? values.name || "Client" : "Add a client"}>
      <HoloPanel className="admin-panel admin-form-panel">
        {waiting ? (
          <p className="admin-empty">{message || "Loading…"}</p>
        ) : (
          <form className="admin-form" onSubmit={onSubmit} noValidate>
            {field("name", "Name")}
            <div className="admin-form-row">
              {field("url", "Website", { type: "url", placeholder: "https://", inputMode: "url" })}
              {field("tags", "Tags", { placeholder: "React, Node" })}
            </div>
            <div className="admin-photo">
              {field("photo", "Photo address", { placeholder: "../images/thumbnails/…" })}
              <div className="admin-photo-preview" aria-hidden="true">
                {values.photo && !photoBroken ? (
                  <img src={previewSrc(values.photo)} alt="" onError={() => setPhotoBroken(true)} />
                ) : (
                  <span>{photoBroken ? "Not found" : "No photo"}</span>
                )}
              </div>
            </div>
            <label className="holo-field">
              <span className="holo-label">Description</span>
              <textarea className="holo-input" name="description" rows={7} value={values.description} onChange={onChange} />
            </label>

            <div className="admin-form-actions">
              <button type="submit" className={saving ? "holo-button is-busy" : "holo-button"} disabled={saving}>
                {saving ? "Saving" : id ? "Save changes" : "Add client"}
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

export default EditClient;
