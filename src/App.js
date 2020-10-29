import React, { Component } from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'

import Routes from './routes'

export class App extends Component {
  render() {
    return (
      <React.Fragment>
        {/* <ToastContainer autoClose={4000} /> */}
        <Routes />
      </React.Fragment>
    )
  }
}

const mapStateToProps = state => ({
})

const mapDispatchToProps = dispatch => ({
})

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(App))
