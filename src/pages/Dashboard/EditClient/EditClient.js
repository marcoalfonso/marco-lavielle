import React, { Component } from 'react'
import { withRouter } from 'react-router-dom'
import { connect } from 'react-redux'
import { toast } from 'react-toastify'
import {
  Button,
  Input,
  Form
} from 'antd'

import { editClient } from 'actions/appActions'

import styles from './EditClient.module.css'

export class EditClient extends Component {
  componentDidMount() {
    document.documentElement.classList.add('desktop')
    document.body.classList.add('loaded')
    document.body.classList.add('home')
    document.body.classList.add('detected')
    document.body.classList.add('desktop')
    document.body.classList.add('level-0')
  }

  handleOk = (e) => {
    e.preventDefault()
    this.props.form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        this.props.editClient(values).then(response => {
          this.props.history.push(`/admin/dashboard`)
          toast.success('You have successfully created a post!')
        })
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
            <dt onClick={e => this.props.history.push(`/admin/post`)}>Create A Post</dt>
            <dd><span className="value"></span><span className="low bar"><span className="fill" style={{width: '100%'}}></span></span><span className="critical low alert"><span className="icon"></span></span></dd>
            <dt onClick={e => this.props.history.push(`/admin/client`)}>Create A Client</dt>
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
                      ]
                    })(
                      <Input className="form-control"/>,
                    )}
                  </Form.Item>
                  <Form.Item label="Tags" className="form-group">
                    {getFieldDecorator('tags', {
                      rules: [
                        {
                          required: true,
                          message: 'Tags is mandatory',
                        }
                      ]
                    })(
                      <Input className="form-control"/>,
                    )}
                  </Form.Item>
                  <Form.Item label="URL" className="form-group">
                    {getFieldDecorator('url', {
                      rules: [
                        {
                          required: true,
                          message: 'URL is mandatory',
                        }
                      ]
                    })(
                      <Input className="form-control"/>,
                    )}
                  </Form.Item>
                  <Form.Item label="Photo URL" className="form-group">
                    {getFieldDecorator('photo', {
                      rules: [
                        {
                          required: true,
                          message: 'Photo URL is mandatory',
                        }
                      ]
                    })(
                      <Input className="form-control"/>,
                    )}
                  </Form.Item>
                  <Form.Item label="Description" className="form-group">
                    {getFieldDecorator('body', {
                      rules: [
                        {
                          required: true,
                          message: 'Body is mandatory',
                        }
                      ]
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
})

const mapDispatchToProps = dispatch => ({
  editClient: (formData, action) => dispatch(editClient(formData, action))
})

const WrappedEditClientForm = Form.create({ name: 'edit_client_form' })(EditClient);

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(WrappedEditClientForm))
