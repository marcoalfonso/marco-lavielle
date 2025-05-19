import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";
import { toast } from "react-toastify";
import { Button, Input, Form } from "antd";
import {
  createPost,
  editPost,
  getPost,
  setPost,
  setClient,
} from "actions/appActions";
import ReactQuill from "react-quill";

import "react-quill/dist/quill.snow.css";
import styles from "./EditPost.module.css";

export class EditPost extends Component {
  componentDidMount() {
    document.body.classList.add("level-0");
    if (this.props.match.params.id) {
      this.props.getPost(this.props.match.params.id);
    }
  }

  handleOk = (e) => {
    e.preventDefault();
    this.props.form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        if (this.props.match.params.id) {
          const valuesWithId = { ...values, _id: this.props.match.params.id };
          this.props.editPost(valuesWithId).then((response) => {
            this.props.history.push(`/admin/dashboard`);
            toast.success("You have successfully edited a post!");
          });
        } else {
          this.props.createPost(values).then((response) => {
            this.props.history.push(`/admin/dashboard`);
            toast.success("You have successfully created a post!");
          });
        }
      }
    });
  };

  render() {
    const { getFieldDecorator } = this.props.form;
    const formats = [
      "header",
      "font",
      "size",
      "bold",
      "italic",
      "underline",
      "strike",
      "blockquote",
      "code-block",
      "list",
      "bullet",
      "indent",
      "link",
      "image",
      "video",
    ];
    const modules = {
      toolbar: [
        [{ header: "1" }, { header: "2" }, { font: [] }],
        [{ size: [] }],
        ["bold", "italic", "underline", "strike", "blockquote", "code-block"],
        [
          { list: "ordered" },
          { list: "bullet" },
          { indent: "-1" },
          { indent: "+1" },
        ],
        ["link", "image", "video"],
        ["clean"],
      ],
      clipboard: {
        // toggle to add extra line breaks when pasting HTML:
        matchVisual: false,
      },
    };
    return (
      <main
        className="page loaded desktop dashboard detected preview-section-1"
        id="page"
      >
        <div className="column-2 backdrop"></div>
        <div className="column-1">
          <a className="uplevel pjax" href="/" data-section="homepage">
            <span className="arrow">‹</span>
            <strong className="logo">
              <span className="m">M</span>
              <span className="a">A</span>
              <span className="r">R</span>
              <span className="c">C</span>
              <span className="o">O</span>
              <br />
              <span className="l">L</span>
              <span className="a2">A</span>
              <span className="v">V</span>
              <span className="i">I</span>
              <span className="e">E</span>
              <span className="l2">L</span>
              <span className="l3">L</span>
              <span className="e2">E</span>
            </strong>
          </a>
          <dl>
            <dt onClick={(e) => this.props.history.push(`/admin/dashboard`)}>
              Dashboard
            </dt>
            <dd>
              <span className="value"></span>
              <span className="low bar">
                <span className="fill" style={{ width: "100%" }}></span>
              </span>
              <span className="critical low alert">
                <span className="icon"></span>
              </span>
            </dd>
            <dt
              onClick={(e) => {
                this.props.setPost(null);
                this.props.history.push(`/admin/post`);
              }}
            >
              Create A Post
            </dt>
            <dd>
              <span className="value"></span>
              <span className="low bar">
                <span className="fill" style={{ width: "100%" }}></span>
              </span>
              <span className="critical low alert">
                <span className="icon"></span>
              </span>
            </dd>
            <dt
              onClick={(e) => {
                this.props.setClient(null);
                this.props.history.push(`/admin/client`);
              }}
            >
              Create A Client
            </dt>
            <dd>
              <span className="value"></span>
              <span className="low bar">
                <span className="fill" style={{ width: "100%" }}></span>
              </span>
              <span className="critical low alert">
                <span className="icon"></span>
              </span>
            </dd>
          </dl>
        </div>
        <div className="level-1-container">
          <div className="container" ng-show="!createPostVisible">
            <div className="well post-list">
              <Form
                onSubmit={(e) => this.handleOk(e)}
                layout="vertical"
                className="signin-form form-horizontal"
              >
                <fieldset>
                  <legend>
                    {this.props.match.params.id ? "Edit Post" : "Create Post"}
                  </legend>
                  <Form.Item label="Title" className="form-group">
                    {getFieldDecorator("title", {
                      rules: [
                        {
                          required: true,
                          message: "Title is mandatory",
                        },
                      ],
                      initialValue: this.props.post && this.props.post.title,
                    })(<Input className="form-control" />)}
                  </Form.Item>
                  <Form.Item label="Subtitle" className="form-group">
                    {getFieldDecorator("subtitle", {
                      rules: [
                        {
                          required: true,
                          message: "Subtitle is mandatory",
                        },
                      ],
                      initialValue: this.props.post && this.props.post.subtitle,
                    })(<Input className="form-control" />)}
                  </Form.Item>
                  <Form.Item label="Author" className="form-group">
                    {getFieldDecorator("author", {
                      rules: [
                        {
                          required: true,
                          message: "Author is mandatory",
                        },
                      ],
                      initialValue: this.props.post && this.props.post.author,
                    })(<Input className="form-control" />)}
                  </Form.Item>
                  <Form.Item label="Body" className="form-group">
                    {getFieldDecorator("body", {
                      rules: [
                        {
                          required: true,
                          message: "Body is mandatory",
                        },
                      ],
                      initialValue: this.props.post && this.props.post.body,
                    })(
                      <ReactQuill
                        theme="snow"
                        formats={formats}
                        modules={modules}
                      />
                    )}
                  </Form.Item>
                  <Button
                    className="btn btn-primary"
                    type="primary"
                    size="large"
                    htmlType="submit"
                    style={{ minWidth: "130px", marginRight: "10px" }}
                  >
                    Save
                  </Button>
                  <Button
                    className="btn btn-default"
                    type="link"
                    size="large"
                    onClick={(e) => this.props.history.push("/admin/dashboard")}
                  >
                    Cancel
                  </Button>
                </fieldset>
              </Form>
            </div>
          </div>
        </div>
      </main>
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
  setPost: (post) => dispatch(setPost(post)),
  setClient: (client) => dispatch(setClient(client)),
});

const WrappedEditPostForm = Form.create({ name: "edit_post_form" })(EditPost);

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(WrappedEditPostForm));
