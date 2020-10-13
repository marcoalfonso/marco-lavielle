import React, { Component } from 'react'
import { withRouter } from 'react-router-dom'
import { connect } from 'react-redux'

import { getPost } from 'actions/appActions'

import styles from './Post.module.css'

export class Post extends Component {
  state = {
    section: 'preview-section-1'
  }

  componentDidMount() {
    // document.documentElement.classList.add('detected')
    // document.documentElement.classList.add('cursor')
    document.documentElement.classList.add('desktop')
    document.body.classList.add('loaded')
    document.body.classList.add('home')
    document.body.classList.add('detected')
    document.body.classList.add('desktop')
    document.body.classList.add('level-1')
    this.props.getPost(this.props.match.params.post)
  }

  render() {
    console.log("this.props", this.props)

    return (
      <main className="page loaded desktop detected preview-section-1" id="page">
        <div className="column-2 wider backdrop for-section-3"></div>
        <div className="column-3 backdrop for-section-3"></div>
        <div className="column-4 backdrop for-section-3"></div>
        <div className="column-1 slim for-level-1 for-section-3">
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
            <h1 className="section-title">Journal</h1>
          </a>
          <dl className="stats journal-stats">
            <div className="twitter-follow-button-wrapper">
              <a className="twitter-follow-button" href="https://twitter.com/marcolavielle" data-show-count="false">Follow @marcolavielle</a>
            </div>
            <dt>Instagram</dt>
            <dd><a href="http://instagram.com/cuban_papi_chulo" target="_blank" rel="nofollow">cuban_papi_chulo</a></dd>
          </dl>
        </div>
        <div className="column-2 scrollable wider for-section-3"></div>
        <div className="l1 level-1-container">
          <div className="column-3"></div>
          <div className="column-4">
            <div className="article-content">
              <div className="container">
                <a className="back pjax uplevel" href="/journal" data-level="0" data-section="section-3">
                  <span className="arrow">{`<`}</span>
                  <span className="text">See All</span>
                  <span className="section-title mobile-only">Journal</span>
                </a>
                <header className="article-info">
                  <h1>{this.props.post && this.props.post.title}</h1>
                  <h2>{this.props.post && this.props.post.subtitle}</h2><small></small>
                </header>
                <div className="article-body" dangerouslySetInnerHTML={{__html: this.props.post && this.props.post.body}}></div>
              </div>
              <div className="footer">
                <div className="container">
                  <p className="copyright">
                    © Marco Lavielle ·
                    <a href="/about" className="about">
                      About this site
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }
}

const mapStateToProps = state => ({
  loading: state.app.loading,
  post: state.app.post
})

const mapDispatchToProps = dispatch => ({
  getPost: (slug) => dispatch(getPost(slug)),
})

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(Post))
