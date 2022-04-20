import React, { Component } from 'react'
import { withRouter } from 'react-router-dom'
import { connect } from 'react-redux'
import styles from './Art.module.css'

export class Art extends Component {
  constructor(props) {
    super(props)
    const img1 = props.paintings[0];
    const img2 = props.paintings[1];
    const img3 = props.paintings[2];
    const img4 = props.paintings[3];
    const img5 = props.paintings[4];
    const img6 = props.paintings[5];

    this.abstractSeries = [img1, img5]
    this.flowerSeries = [img4, img3]
    this.acrylicSeries = [img2, img6]

    this.state = {
      index: 0,
      imgList: this.abstractSeries
    }
  }

  onClickForward = () => {
    if (this.state.index + 1 === this.state.imgList.length) {
      this.setState({ index: 0 })
    } else {
      this.setState({ index: this.state.index + 1 })
    }
  }

  onClickBack = () => {
    if (this.state.index - 1 === -1) {
      this.setState({ index: this.state.imgList.length - 1 })
    } else {
      this.setState({ index: this.state.index - 1 })
    }
  }

  setFlowerSeries = () => {
    this.setState({ imgList: this.flowerSeries, index: 0 })
  }

  setAbstractSeries = () => {
    this.setState({ imgList: this.abstractSeries, index: 0 })
  }

  setAcrylicSeries = () => {
    this.setState({ imgList: this.acrylicSeries, index: 0 })
  }

  render() {
    return (
      <div>
        <div className="container">
          <div className="menu">
            <h1 className="menu-logo">
              <div className="logo-text">Marco Lavielle</div>
            </h1>
            <ul className="menu-nav">
        			<li className="item  top_level">
        				<a href="/" target="_self" className="">
        					Home
        				</a>
        			</li>
        			<li className="category top_level">
        				<a className="category_name">
        					Paintings
        				</a>
        				<ul className="dropdown">
                  <li className="item">
        						<a onClick={this.setAbstractSeries} className={this.state.imgList === this.abstractSeries ? 'active' : null}>
        							<span className="before">—</span>Abstract Series
        						</a>
        					</li>
        					<li className="item">
        						<a onClick={this.setFlowerSeries} className={this.state.imgList === this.flowerSeries ? 'active' : null}>
        							<span className="before">—</span>Flower Series
        						</a>
        					</li>
                  <li className="item">
        						<a onClick={this.setAcrylicSeries} className={this.state.imgList === this.acrylicSeries ? 'active' : null}>
        							<span className="before">—</span>Acrylic Series
        						</a>
        					</li>
        				</ul>
        			</li>
        			<li className="item  top_level">
        				<a href="/about" className="">
        					Contact
        				</a>
        			</li>
            </ul>
          </div>
        </div>
        <div id="close" className="hidden">
          <a className="link-close"><img src="../images/artwork/header-close.svg"/></a>
        </div>
        <div id="exp-frame" className="inset-square">
          <div id="header" className="header">

            {/*<div id="logo" className="logo"><a><img src="../images/artwork/header-logo.svg"/></a></div>*/}
            <div className="nav-top">
              <a id="video-link" className="link-video"><img src="../images/artwork/header-video.svg"/></a>
              <a className="link-shop" target="_blank" href="https://dreamdiary.greedbag.com/"><img src="../images/artwork/header-shop.svg"/></a>

              <div className="stream">
                <a className="stream-ap" target="_blank" href="https://itunes.apple.com/gb/album/soul-to-skin-ep/1372231203"></a>
                <a className="stream-sp" target="_blank" href="https://open.spotify.com/artist/6Aj8TtYDe1X42BuRrkvIvT?si=IciPpNjhROiJqgoem5crgw"></a>
                <a className="stream-sc" target="_blank" href="https://soundcloud.com/vtrpage"></a>
              </div>
            </div>
            {/*<div id="title" className="title right hidden"><a><img src="../images/artwork/header-title.svg"/></a></div>*/}
          </div>
          <div id="cover" onClick={this.onClickForward}>
            <img className="vtr-cover" width="100%" height="100%" src={this.state.imgList[this.state.index]}/>
          </div>
          <iframe id="video" className="hidden" width="100%" height="100%" frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen=""></iframe>
          <iframe id="exp" className="hidden" width="100%" height="100%" src="../images/experience.html" frameBorder="0"></iframe>
        </div>
        <div className="footer">
          {/*<div className="back">
            <a href="/" target="_self">Home</a>
          </div>*/}
          <div className="next">
            <a href="#" onClick={this.onClickBack}>Previous</a>
            {`  |  `}
            <a href="#" onClick={this.onClickForward}>Next</a>
            <span className="counter">(<span id="current">{this.state.index + 1}</span> of <span id="total">{this.state.imgList.length}</span>)</span>
          </div>
          <audio id="music">
            <source src="../images/whisper.mp3" type="audio/mpeg"/>
          </audio>
        </div>
      </div>
    )
  }
}

const mapStateToProps = state => ({
  paintings: state.app.paintings,
})

const mapDispatchToProps = dispatch => ({
})

export default connect(mapStateToProps, mapDispatchToProps)(Art)
