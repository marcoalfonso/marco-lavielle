import React, { Component } from 'react'
import { connect } from 'react-redux'
import styles from './Art.scss'

export class Art extends Component {
  constructor() {
    super()

    const img1 = '../images/paintings/abstract_2.jpg';
    const img2 = '../images/paintings/girl.jpg';
    const img3 = '../images/paintings/flowers_1.jpg';
    const img4 = '../images/paintings/flowers_2.jpg';
    const img5 = '../images/paintings/flowers_3.jpg';
    const img6 = '../images/paintings/straya.jpg';

    this.state = {
      index: 0,
      imgList: [img1, img2, img3, img4, img6]
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
        						<a href="#" className="active">
        							<span className="before">—</span>2017 - 2019
        						</a>
        					</li>
        					{/*<li className="item">
        						<a href="/4428911-2017" className="">
        							<span className="before">—</span>Flower Series
        						</a>
        					</li>*/}
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

export default Art
