import React, { Component } from 'react'
import { withRouter } from 'react-router-dom'
import { connect } from 'react-redux'
import { toast } from 'react-toastify'
import {
  Button,
  Input,
  Form
} from 'antd'

import { editClient, getClient, createClient, setPost, setClient } from 'actions/appActions'

import styles from './EditClient.module.css'

export class EditClient extends Component {
  componentDidMount() {
    document.body.classList.add('level-0')
    if (this.props.match.params.id) {
      this.props.getClient(this.props.match.params.id)
    }
  }

  handleOk = (e) => {
    e.preventDefault()
    this.props.form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        console.log("this.props.match.params.id", this.props.match.params.id)
        if (this.props.match.params.id) {
          const valuesWithId = {...values, _id: this.props.match.params.id}
          this.props.editClient(valuesWithId).then(response => {
            this.props.history.push(`/admin/dashboard`)
            toast.success('You have successfully updated a client!')
          })
        } else {
          this.props.createClient(values).then(response => {
            this.props.history.push(`/admin/dashboard`)
            toast.success('You have successfully created a client!')
          })
        }
        
      }
    })
  }

  render() {
    const { getFieldDecorator } = this.props.form
    return (
      <main className="page loaded desktop dashboard detected preview-section-1" id="page">
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
              <br/>
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
            <dt onClick={e => this.props.history.push(`/admin/dashboard`)}>Dashboard</dt>
            <dd>
              <span className="value"></span>
              <span className="low bar">
                <span className="fill" style={{width: '100%'}}></span>
              </span>
              <span className="critical low alert">
                <span className="icon"></span>
              </span>
            </dd>
            <dt 
              onClick={e => {
                this.props.setPost(null)
                this.props.history.push(`/admin/post`)
              }}
            >
              Create A Post
            </dt>
            <dd><span className="value"></span><span className="low bar"><span className="fill" style={{width: '100%'}}></span></span><span className="critical low alert"><span className="icon"></span></span></dd>
            <dt 
              onClick={e => {
                this.props.setClient(null)
                this.props.history.push(`/admin/client`)
              }}
            >
              Create A Client
            </dt>
            <dd><span className="value"></span><span className="low bar"><span className="fill" style={{width: '100%'}}></span></span><span className="critical low alert"><span className="icon"></span></span></dd>
          </dl>
        </div>
        <div className="level-1-container">
          <div className="container" ng-show="!createPostVisible">
            <div className="well post-list">
              <Form onSubmit={e => this.handleOk(e)} layout="vertical" className="signin-form form-horizontal">
                <fieldset>
                  <legend>Create A Client</legend>
                  <Form.Item label="Name" className="form-group">
                    {getFieldDecorator('name', {
                      rules: [
                        {
                          required: true,
                          message: 'Name is mandatory',
                        }
                      ],
                      initialValue: this.props.client && this.props.client.name
                    })(
                      <Input className="form-control"/>,
                    )}
                  </Form.Item>
                  <Form.Item label="Tags" className="form-group">
                    {getFieldDecorator('tags', {
                      initialValue: this.props.client && this.props.client.tags
                    })(
                      <Input className="form-control"/>,
                    )}
                  </Form.Item>
                  <Form.Item label="URL" className="form-group">
                    {getFieldDecorator('url', {
                      initialValue: this.props.client && this.props.client.url
                    })(
                      <Input className="form-control"/>,
                    )}
                  </Form.Item>
                  <Form.Item label="Photo URL" className="form-group">
                    {getFieldDecorator('photo', {
                      initialValue: this.props.client && this.props.client.photo
                    })(
                      <Input className="form-control"/>,
                    )}
                  </Form.Item>
                  <Form.Item label="Description" className="form-group">
                    {getFieldDecorator('description', {
                      initialValue: this.props.client && this.props.client.description
                    })(
                      <Input.TextArea rows={10} className="form-control"/>,
                    )}
                  </Form.Item>
                  <Button className="btn btn-primary" type="primary" size="large" htmlType="submit" style={{ minWidth: '130px', marginRight: '10px' }}>
                    Save
                  </Button>
                  <Button className="btn btn-default" type="link" size="large" onClick={e => this.props.history.push('/admin/dashboard')}>
                    Cancel
                  </Button>
                </fieldset>
              </Form>
            </div>
          </div>
        </div>
      </main>
    )
  }
}

const mapStateToProps = state => ({
  client: state.app.client
})

const mapDispatchToProps = dispatch => ({
  editClient: (formData) => dispatch(editClient(formData)),
  getClient: id => dispatch(getClient(id)),
  createClient: (formData) => dispatch(createClient(formData)),
  setPost: post => dispatch(setPost(post)),
  setClient: client => dispatch(setClient(client))
})

const WrappedEditClientForm = Form.create({ name: 'edit_client_form' })(EditClient);

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(WrappedEditClientForm))
