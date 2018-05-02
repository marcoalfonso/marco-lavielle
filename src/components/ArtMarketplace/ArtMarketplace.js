import React, { Component } from 'react'
import { connect } from 'react-redux'

export class ArtMarketplace extends Component {

  render() {
    return (
      <div className="row">
        <div className="col-xs-12">
          <h2>ART</h2>
        </div>
      </div>
    )
  }
}

const mapStateToProps = state => ({
})

const mapDispatchToProps = dispatch => ({
})

export default connect(mapStateToProps, mapDispatchToProps)(ArtMarketplace)
