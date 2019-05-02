import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withRouter, Switch, Route } from 'react-router-dom'
import Art from '../components/Art/Art'

class ArtPage extends Component {

  render() {
    const { match } = this.props

    return (
      <Switch>
        <Route exact path={match.url} render={() => <Art {...this.props} />} />
      </Switch>
    )
  }
}

ArtPage.propTypes = {
  match: PropTypes.object.isRequired
}

const mapStateToProps = state => ({
})

const mapDispatchToProps = dispatch => ({
})

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(ArtPage))
