import React, { Component } from 'react'
import { withRouter } from 'react-router-dom'
import { connect } from 'react-redux'
import {
  Button,
  Input,
  Form
} from 'antd'
import { withCookies } from 'react-cookie'
import { toast } from 'react-toastify'
import { signin } from 'actions/appActions'

import styles from './Signin.module.css'

export class Signin extends Component {
  state = {
    section: 'preview-section-1'
  }

  handleOk = (e) => {
    e.preventDefault()
    this.props.form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        this.props.signin(values, this.props.history).then(response =>{
          this.props.cookies.set('loggedIn', true)
          this.props.history.push(`/admin/dashboard`)
          toast.success('You have successfully signed in!')
        })
      }
    })
  }

  render() {
    const { getFieldDecorator } = this.props.form
    return (
      <div className="container">
        <div className="well">
          <Form onSubmit={e => this.handleOk(e)} layout="vertical" className="signin-form form-horizontal">
            <fieldset>
              <legend>Only The Best Make It This Far</legend>
              <Form.Item label="Username" className="form-group">
                {getFieldDecorator('username', {
                  rules: [
                    {
                      required: true,
                      message: 'Username is mandatory',
                    }
                  ]
                })(
                  <Input className="form-control"/>,
                )}
              </Form.Item>
              <Form.Item label="Password" className="form-group">
                {getFieldDecorator('password', {
                  rules: [
                    {
                      required: true,
                      message: 'Password is mandatory',
                    }
                  ]
                })(
                  <Input type="password" className="form-control"/>,
                )}
              </Form.Item>
              <Button className="btn btn-primary" type="primary" size="large" htmlType="submit">
                Sign In
              </Button>
            </fieldset>
          </Form>
        </div>
      </div>
    )
  }
}

const mapStateToProps = state => ({

})

const mapDispatchToProps = dispatch => ({
  signin: (formData, history) => dispatch(signin(formData, history))
})

const WrappedSigninForm = Form.create({ name: 'signin_form' })(Signin);

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(withCookies(WrappedSigninForm)))
