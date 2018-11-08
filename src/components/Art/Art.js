import React, { Component } from 'react'
import { connect } from 'react-redux'
import styles from './Art.scss'
export class Art extends Component {

  nextImage() {

  }

  render() {
    return (
      <div>
        <div id="exp-frame" className="inset-square">
          <div id="header" className="header">

            <div id="logo" className="logo"><a><img src="../images/artwork/header-logo.svg"/></a></div>
            <div className="nav-top">
              <a id="video-link" className="link-video"><img src="images/header-video.svg"/></a>
              <a className="link-shop" target="_blank" href="https://dreamdiary.greedbag.com/"><img src="images/header-shop.svg"/></a>

              <div className="stream">
                <a className="stream-ap" target="_blank" href="https://itunes.apple.com/gb/album/soul-to-skin-ep/1372231203"></a>
                <a className="stream-sp" target="_blank" href="https://open.spotify.com/artist/6Aj8TtYDe1X42BuRrkvIvT?si=IciPpNjhROiJqgoem5crgw"></a>
                <a className="stream-sc" target="_blank" href="https://soundcloud.com/vtrpage"></a>
              </div>
            </div>
            <div id="title" className="title right"><a><img src="../images/artwork/header-title.svg"/></a></div>
          </div>
          <div id="cover" className="">
            <img className="vtr-cover" width="100%" height="100%" src="../images/artwork/vtr-cover.jpg"/>
          </div>
        </div>
        <div className="footer">
          <div className="back">
            <a href="/" target="_self">Home</a>
          </div>
          <div className="next">
            <a href="#" onClick={() => this.nextImage}>Next</a>
          </div>
        </div>
      </div>
    )
  }
}

const mapStateToProps = state => ({
})

const mapDispatchToProps = dispatch => ({
})

export default connect(mapStateToProps, mapDispatchToProps)(Art)
