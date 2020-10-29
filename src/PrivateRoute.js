import React, { Component } from 'react'
import { connect } from 'react-redux'
import { Route, Redirect, withRouter } from 'react-router-dom'
import { withCookies } from 'react-cookie'

class PrivateRoute extends Component {
  render() {
    const { component: Component, ...rest } = this.props
    const loggedIn = this.props.cookies.get('loggedIn')

    return (
      <Route
        {...rest}
        render={props => {
          if (loggedIn) {
            return <Component {...props} />
          }

          return <Redirect to={{ pathname: '/', state: { from: props.location } }} />
        }}
      />
    )
  }
}

const mapStateToProps = state => ({
})

const mapDispatchToProps = dispatch => ({
})

export default withCookies(withRouter(connect(mapStateToProps, mapDispatchToProps)(PrivateRoute)))
