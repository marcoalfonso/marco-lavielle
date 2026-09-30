import React, { Component } from "react";
import { Link, withRouter } from "react-router-dom";
import { connect } from "react-redux";
import { createClient, editClient, getClient } from "actions/appActions";
import HoloPanel from "components/holo/HoloPanel";
import AdminLayout, { describeError } from "../AdminLayout";

const EMPTY = { name: "", tags: "", url: "", photo: "", description: "" };

// photos are saved relative to the Software page ("../images/…"); from an
// admin page that would point elsewhere, so preview them from the site root
const previewSrc = (photo) => photo.trim().replace(/^(\.\.\/)+/, "/");

export class EditClient extends Component {
  state = { values: EMPTY, loaded: false, errors: {}, message: null, saving: false, photoBroken: false };

  componentDidMount() {
    this.load();
  }

  load = () => {
    const { id } = this.props.match.params;
    if (id) this.props.getClient(id).catch((err) => this.setState({ message: describeError(err) }));
  };

  componentDidUpdate(prevProps) {
    const { id } = this.props.match.params;
    if (id !== prevProps.match.params.id) {
      // another client: start over
      this.setState({ values: EMPTY, loaded: false, errors: {}, message: null, saving: false }, this.load);
      return;
    }
    // fill the form once the client being edited has arrived
    const { client } = this.props;
    if (id && !this.state.loaded && client && client._id === id) {
      const values = {};
      Object.keys(EMPTY).forEach((key) => {
        values[key] = client[key] || "";
      });
      this.setState({ loaded: true, values });
    }
  }

  onChange = (e) => {
    const { name, value } = e.target;
    this.setState(({ values, errors }) => ({
      values: { ...values, [name]: value },
      errors: { ...errors, [name]: null },
      photoBroken: name === "photo" ? false : this.state.photoBroken,
    }));
  };

  onSubmit = (e) => {
    e.preventDefault();
    const { values, saving } = this.state;
    if (saving) return;
    if (!values.name.trim()) {
      this.setState({ errors: { name: "Name is required" } });
      return;
    }
    const { id } = this.props.match.params;
    this.setState({ saving: true, message: null });
    const save = id ? this.props.editClient({ ...values, _id: id }) : this.props.createClient(values);
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
    const { values, message, saving, loaded, photoBroken } = this.state;
    const waiting = id && !loaded;
    return (
      <AdminLayout kicker={id ? "Edit client" : "New client"} title={id ? values.name || "Client" : "Add a client"}>
        <HoloPanel className="admin-panel admin-form-panel">
          {waiting ? (
            <p className="admin-empty">{message || "Loading…"}</p>
          ) : (
            <form className="admin-form" onSubmit={this.onSubmit} noValidate>
              {this.field("name", "Name")}
              <div className="admin-form-row">
                {this.field("url", "Website", { type: "url", placeholder: "https://", inputMode: "url" })}
                {this.field("tags", "Tags", { placeholder: "React, Node" })}
              </div>
              <div className="admin-photo">
                {this.field("photo", "Photo address", { placeholder: "../images/thumbnails/…" })}
                <div className="admin-photo-preview" aria-hidden="true">
                  {values.photo && !photoBroken ? (
                    <img src={previewSrc(values.photo)} alt="" onError={() => this.setState({ photoBroken: true })} />
                  ) : (
                    <span>{photoBroken ? "Not found" : "No photo"}</span>
                  )}
                </div>
              </div>
              <label className="holo-field">
                <span className="holo-label">Description</span>
                <textarea className="holo-input" name="description" rows={7} value={values.description} onChange={this.onChange} />
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
  }
}

const mapStateToProps = (state) => ({
  client: state.app.client,
});

const mapDispatchToProps = (dispatch) => ({
  editClient: (formData) => dispatch(editClient(formData)),
  getClient: (id) => dispatch(getClient(id)),
  createClient: (formData) => dispatch(createClient(formData)),
});

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(EditClient));
