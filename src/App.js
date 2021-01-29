import React, { Component } from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import ReactResizeDetector from 'react-resize-detector'
import { setDevice } from 'actions/appActions'

import Routes from './routes'

export class App extends Component {
  componentDidMount() {
    document.documentElement.classList.add('detected')
    document.documentElement.classList.add('cursor')
    document.body.classList.add('loaded')
    document.body.classList.add('home')
    document.body.classList.add('detected')
  }

  render() {
    return (
      <ReactResizeDetector
        handleWidth
        onResize={width => {
          console.log("width", width)
          if (width < 812 && width !== 0) {
            document.documentElement.classList.remove('desktop')
            document.body.classList.remove('desktop')
            document.documentElement.classList.add('mobile')
            document.body.classList.add('mobile')
            this.props.setDevice('mobile')
          } else {
            document.documentElement.classList.remove('mobile')
            document.body.classList.remove('mobile')
            document.documentElement.classList.add('desktop')
            document.body.classList.add('desktop')
            this.props.setDevice('desktop')
          }
        }}
      >
        {/* <ToastContainer autoClose={4000} /> */}
        <Routes />
      </ReactResizeDetector>
    )
  }
}

const mapStateToProps = state => ({
})

const mapDispatchToProps = dispatch => ({
  setDevice: device => dispatch(setDevice(device))
})

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(App))
