import React, { Component } from 'react'
import { withRouter } from 'react-router-dom'
import { connect } from 'react-redux'

import { getPosts, getClients, deleteClient, deletePost, setPost, setClient } from 'actions/appActions'

import styles from './Dashboard.module.css'

export class Dashboard extends Component {
  componentDidMount() {
    document.documentElement.classList.add('desktop')
    document.body.classList.add('loaded')
    document.body.classList.add('home')
    document.body.classList.add('detected')
    document.body.classList.add('desktop')
    document.body.classList.add('level-0')
    this.props.getPosts()
    this.props.getClients()
  }

  render() {
    return (
      <main className="page loaded desktop dashboard detected preview-section-1" id="page">
        <div className="column-2 backdrop"></div>
        <div className="column-1">
          <a className="uplevel pjax" href="/" data-section="homepage">
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
          </a>
          <dl>
            <dt onClick={e => this.props.history.push(`/admin/dashboard`)}>Dashboard</dt>
            <dd>
              <span className="value"></span>
              <span className="low bar">
                <span className="fill" style={{width: '100%'}}></span>
              </span>
              <span className="critical low alert">
                <span className="icon"></span>
              </span>
            </dd>
            <dt 
              onClick={e => {
                this.props.setPost(null)
                this.props.history.push(`/admin/post`)
              }}
            >
              Create A Post
            </dt>
            <dd><span className="value"></span><span className="low bar"><span className="fill" style={{width: '100%'}}></span></span><span className="critical low alert"><span className="icon"></span></span></dd>
            <dt 
              onClick={e => {
                this.props.setClient(null)
                this.props.history.push(`/admin/client`)
              }}
            >
              Create A Client
            </dt>
            <dd><span className="value"></span><span className="low bar"><span className="fill" style={{width: '100%'}}></span></span><span className="critical low alert"><span className="icon"></span></span></dd>
          </dl>
        </div>
        <div className="level-1-container">
          <div className="container" ng-show="!createPostVisible">
            <div className="well post-list">
              <legend>Posts</legend>
              <table className="table table-hover table-striped table-condensed">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Publish Date</th>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {this.props.posts && this.props.posts.map((post, index) => {
                    return (
                      <tr key={index}>
                        <td><a href={`/journal/${post._id}`}>{post.title}</a></td>
                        <td>{post.published}</td>
                        <td><a className="btn btn-small btn-primary" onClick={e => this.props.history.push(`/admin/post/${post._id}`)}>Edit</a></td>
                        <td><a className="btn btn-small btn-danger" onClick={e => this.props.deletePost(post._id)}>Delete</a></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <legend>Clients</legend>
              <table className="table table-hover table-striped table-condensed">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Publish Date</th>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {this.props.clients && this.props.clients.map((client, index) => {
                    return (
                      <tr key={index}>
                        <td><a href={`/software`}>{client.name}</a></td>
                        <td>{client.published}</td>
                        <td><a className="btn btn-small btn-primary" onClick={e => this.props.history.push(`/admin/client/${client._id}`)}>Edit</a></td>
                        <td><a className="btn btn-small btn-danger" onClick={e => this.props.deleteClient(client._id)}>Delete</a></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
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
  clients: state.app.clients
})

const mapDispatchToProps = dispatch => ({
  getPosts: () => dispatch(getPosts()),
  getClients: () => dispatch(getClients()),
  deletePost: id => dispatch(deletePost(id)),
  deleteClient: id => dispatch(deleteClient(id)),
  setPost: post => dispatch(setPost(post)),
  setClient: client => dispatch(setClient(client))
})

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(Dashboard))
