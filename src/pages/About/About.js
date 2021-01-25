import React, { Component } from 'react'
import { withRouter } from 'react-router-dom'
import { connect } from 'react-redux'

import styles from './About.module.css'

export class About extends Component {
  componentDidMount() {
    document.body.classList.add('level-0')
  }

  render() {
    return (
      <main className={`page loaded level-1 ${this.props.device} detected scan-faster`} id="page">
        <div className="column-1">
          <a className="uplevel pjax" href="/" data-section="home">
            <span className="arrow">‹</span>
            <strong className="logo">
              <span className="m">M</span>
              <span className="a">A</span>
              <span className="r">R</span>
              <span className="c">C</span>
              <span className="o">O</span>
              <br/>
              <span className="l">L</span>
              <span className="a2">A</span>
              <span className="v">V</span>
              <span className="i">I</span>
              <span className="e">E</span>
              <span className="l2">L</span>
              <span className="l3">L</span>
              <span className="e2">E</span>
            </strong>
            <h1 className="section-title mobile-only">About</h1>
          </a>
        </div>
        <div className="about-content">
          <div className="fancy-header">
            <h1>Thanks for visiting</h1>
            <h2>I Design & Build Things</h2>
          </div>
          <div className="personal-info">
            <div className="container">
              <div className="mri mobile-only">
                <span className="grey layer" style={{ animationName: 'none' }}></span>
                <span className="layer one" style={{ animationName: 'mri-glow-1' }}></span>
                <span className="layer two" style={{ animationName: 'mri-glow-2' }}></span>
                <span className="layer three" style={{ animationName: 'mri-glow-3' }}></span>
                <span className="layer four" style={{ animationName: 'mri-glow-4' }}></span>
                <span className="layer five" style={{ animationName: 'mri-glow-5' }}></span>
                <span className="blip" style={{ animationName: 'mri-blip' }}>
                  <span className="cover-below"></span>
                </span>
              </div>
              <div className="text">
                <p>Hi, I'm Marco Lavielle, I design and develop web apps and VR apps. In my free time I do ART projects in paiting and VR.</p>
                <p>This site is a showcase of my work. Get in touch if you want to explore collaborating on a project.</p>
              </div>
              <div className="stats">
                <dl className="stats-1">
                  <dt>Name</dt>
                  <dd>Marco Lavielle</dd>
                  <dt>Birthday</dt>
                  <dd>October 13</dd>
                  <dt>Currently in</dt>
                  <dd>Sydney</dd>
                </dl>
                <dl className="stats-2 smaller">
                  <dt>Telephone</dt>
                  <dd>0423478156</dd>
                  <dt>Email</dt>
                  <dd>marco@hackerfirm.com</dd>
                  <dt>Address</dt>
                  <dd>Clovelly, NSW, Sydney</dd>
                  <dt><a href="/signin" data-section="about">Login</a></dt>
                </dl>
              </div>
            </div>
          </div>
          <div className="attribution">
            <ul>
              <li className="linkedin"><span className="logo"></span>
              </li>
              <li className="twitter"><span className="logo"></span>
              </li>
              <li className="facebook"><span className="logo"></span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    )
  }
}

const mapStateToProps = state => ({
  loading: state.app.loading,
  device: state.app.device
})

const mapDispatchToProps = dispatch => ({
})

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(About))
