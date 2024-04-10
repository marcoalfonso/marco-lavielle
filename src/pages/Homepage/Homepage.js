import React, { Component } from 'react'
import { withRouter } from 'react-router-dom'
import { connect } from 'react-redux'

import { getClients, getPosts } from 'actions/appActions'

import styles from './Homepage.module.css'

export class Homepage extends Component {
  state = {
    section: 'preview-section-1'
  }

  componentDidMount() {
    this.props.getClients()
    this.props.getPosts()
  }

  toggleHoverSection = (section) => {
    this.setState({section: section})
  }

  render() {
    return (
      <main className={`page loaded ${this.props.device} detected ${this.state.section} homepage`} id="page">
        <h1 className="logo home-logo">
          <span className="m">M</span>
          <span className="a">A</span>
          <span className="r">R</span>
          <span className="c">C</span>
          <span className="o">O</span>
          <span className="space"> </span>
          <span className="l">L</span>
          <span className="a2">A</span>
          <span className="v">V</span>
          <span className="i">I</span>
          <span className="e">E</span>
          <span className="l2">L</span>
          <span className="l3">L</span>
          <span className="e2">E</span>
        </h1>
        <ul className="sections-nav">
          <span className="selection cursor-only"></span>
          <li className="section-1" onMouseEnter={e => this.toggleHoverSection('preview-section-1')}>
            <a href="/software" target="_self">
              <strong>Software</strong>
              <span className="alive icon section-1-icon">
                <span className="bar one"></span>
                <span className="bar two"></span>
                <span className="bar three"></span>
              </span>
              <small>Portfolio</small>
            </a>
          </li>
          <li className="section-2" onMouseEnter={e => this.toggleHoverSection('preview-section-2')}>
            <a href="/art" target="_self">
              <strong>Paintings</strong>
              <small>Gallery</small>
            </a>
          </li>
          <li className="section-3" onMouseEnter={e => this.toggleHoverSection('preview-section-3')}>
            <a href="/journal" data-section="journal">
              <strong>Thoughts</strong>
              <small>Blog</small>
            </a>
          </li>
        </ul>
        <div className="spinner stationary desktop-only">
          <div className="section-1-spinner-content content-preview">
            <div className="map-container">
              <div className="map-goes-here" id="map-goes-here">
                <div className="the-map"></div>
                <span className="blip location-coordinates positioned showing" style={{left: '220px', top: '136px'}}>
                  <span className="blip-ring one"></span>
                  <span className="blip-ring two"></span>
                  <span className="blip-ring three"></span>
                  <span className="center">
                    <span></span>
                  </span>
                </span>
              </div>
            </div>
            <div className="run-details run-card">
              <div className="details">
                <h3>Coding portfolio</h3>
                <h4>Software and Companies</h4>
                <a className="pjax all" href="/software" target="_self">See Work</a>
              </div>
            </div>
          </div>
          <div className="section-2-spinner-content content-preview">
            <div className="map-container">
              <div className="map-goes-here" id="map-goes-here">
                <div className="the-map"></div>
                <span className="blip location-coordinates positioned showing" style={{left: '220px', top: '136px'}}>
                  <span className="blip-ring one"></span>
                  <span className="blip-ring two"></span>
                  <span className="blip-ring three"></span>
                  <span className="center">
                    <span></span>
                  </span>
                </span>
              </div>
            </div>
            {/* <div className="location-details">
              <h3 className="location-city">Sydney, NSW</h3>
              <h4 className="location-time-ago">Australia</h4>
            </div> */}
            <div className="details">
              <h3>Painting Portfolio</h3>
              <h4>Gallery and Shop</h4>
              <a className="pjax all" href="/art" target="_self">See Gallery</a>
            </div>
          </div>
          <div className="section-2 top-circle-contents">
            {/* <small>Currently In</small>
            <span className="location-name">Sydney</span>
            <span className="location-icon">
              <img src="../images/home_32.png"/>
            </span> */}
            <strong>{this.props.paintings && this.props.paintings.length}</strong>
            <small>{this.props.paintings && this.props.paintings.length === 1 ? 'Painting' : 'Paintings'}</small>
          </div>
          <div className="section-3-spinner-content content-preview">
            <h2>{this.props.posts && this.props.posts[this.props.posts.length - 1].title}</h2>
            <p>{this.props.posts && this.props.posts[this.props.posts.length - 1].subtitle}</p>
            <a className="all" href={`/journal/${this.props.posts && this.props.posts[this.props.posts.length - 1].slug}`} data-section="journal">Read More</a>
          </div>
          <div className="section-3 top-circle-contents">
            <strong>{this.props.posts && this.props.posts.length}</strong>
            <small>{this.props.posts && this.props.posts.length === 1 ? 'Post' : 'Posts'}</small>
          </div>
        </div>
        <div className="spinner spinning desktop-only">
          <span className="rings">
            <span className="group-1">
              <span className="ring zero"></span>
            </span>
            <span className="ring one"></span>
            <span className="group-2">
              <span className="ring two"></span>
            </span>
            <span className="group-3">
              <span className="ring three"></span>
              <span className="ring four"></span>
            </span>
          </span>
          <div className="section-1-preview desktop-only">
            <span className="mini-preview">
              <span className="symbol">
                <span className="text">Software</span>
              </span>
            </span>
            <a className="full-preview section-1 section-1-circles" href="/software" target="_self">
              <span className="circle-a circle backdrop"></span>
              <span className="circle-b circle backdrop"></span>
              <span className="circle-a full circle">
                <span className="the-circle"></span>
                <strong>{this.props.clients && this.props.clients.length}</strong>
                <small>{this.props.clients && this.props.clients.length === 1 ? 'Client' : 'Clients'}</small>
              </span>
              {/* <span className="circle-b full circle">
                <span className="the-circle"></span>
                <strong>2</strong>
                <small>Cities</small>
              </span> */}
            </a>
          </div>
          <div className="section-2-preview desktop-only">
            <span className="mini-preview">
              <span className="symbol">
                <span className="text">Paintings</span>
              </span>
            </span>
            <a className="full-preview section-2" href="/art" data-section="section-2">
              <span className="big-circle backdrop"></span>
              <span className="big-circle actual"></span>
            </a>
          </div>
          <div className="section-3-preview desktop-only">
            <span className="mini-preview">
              <span className="symbol">
                <span className="text">Journal</span>
              </span>
            </span>
            <a className="full-preview section-3" href="/journal" data-section="section-3">
              <span className="big-circle backdrop"></span>
              <span className="big-circle actual"></span>
            </a>
          </div>
        </div>
        <div className="spinner spinning mobile-only">
          <span className="rings">
            <span className="group-1">
              <span className="ring zero"></span>
            </span>
            <span className="ring one"></span>
            <span className="group-2">
              <span className="ring two"></span>
            </span>
            <span className="group-3">
              <span className="ring three"></span>
              <span className="ring four"></span>
            </span>
          </span>
        </div>
        <div className="home-last-location mobile-only">
          <h3>Coder/Painter</h3>
          <section className="location-details">
            <h1 className="location-name long">
              <a className="transitioned">
                <span className="name">Location</span>
                <span className="location-icon"></span>
              </a>
            </h1>
            <small>
              <span className="location-city">Sydney, Australia</span>
            </small>
          </section>
        </div>
        <span className="spinner-cover mobile-only"></span>
        <div className="footer home-footer">
          <p className="copyright"><a href="/about" data-section="about">About and Contact</a></p>
        </div>
      </main>
    )
  }
}

const mapStateToProps = state => ({
  loading: state.app.loading,
  clients: state.app.clients,
  posts: state.app.posts,
  device: state.app.device,
  paintings: state.app.paintings,
})

const mapDispatchToProps = dispatch => ({
  getClients: () => dispatch(getClients()),
  getPosts: () => dispatch(getPosts()),
})

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(Homepage))
