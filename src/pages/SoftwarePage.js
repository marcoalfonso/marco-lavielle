import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withRouter, Switch, Route } from 'react-router-dom'
import Software from '../components/Software/Software'

class SoftwarePage extends Component {

  render() {
    const { match } = this.props

    return (
      <Switch>
        <Route exact path={match.url} render={() => <Software {...this.props} />} />
      </Switch>
    )
  }
}

SoftwarePage.propTypes = {
  match: PropTypes.object.isRequired
}

const mapStateToProps = state => ({
})

const mapDispatchToProps = dispatch => ({
})

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(SoftwarePage))
