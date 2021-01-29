import React, { Component } from 'react'
import { withRouter } from 'react-router-dom'
import { connect } from 'react-redux'
import _ from 'underscore'

import { getPosts } from 'actions/appActions'

import styles from './Journal.module.css'

export class Journal extends Component {
  componentDidMount() {
    document.body.classList.add('level-0')
    this.props.getPosts()
  }

  render() {
    const posts = this.props.posts && _.sortBy(this.props.posts, 'published').reverse()
    return (
      <main className={`loaded ${this.props.device} detected preview-section-1`} id="page">
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
        </div>
        <div className="l1 level-1-container">
          <div className="column-3">
            <div className="article-content">
              <div className="articles-list">
                {posts && posts.map((post, index) => {
                  return (
                    <div key={index} className="article-preview">
                      <h1><a href={`/journal/${post.slug}`}>{post.title}</a></h1>
                      <p>{post.subtitle}</p><a className="pjax read-more" href={`/journal/${post.slug}`}>Read More</a>
                    </div>
                  )
                })}
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
  posts: state.app.posts,
  device: state.app.device
})

const mapDispatchToProps = dispatch => ({
  getPosts: () => dispatch(getPosts()),
})

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(Journal))
