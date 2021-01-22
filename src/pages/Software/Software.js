import React, { Component } from 'react'
import { connect } from 'react-redux'
import _ from 'underscore'
import { getClients } from 'actions/appActions'

import styles from './Software.module.css'

export class Software extends Component {
  componentDidMount() {
    this.props.getClients()
  }

  render() {
    const sortedClients = _.sortBy(this.props.clients && this.props.clients, 'name');
    return (
      <div className={`home ng-scope loaded detected ${this.props.device} level-0`}>
        <section className="content">
          <div id="device-info" className={`ng-scope loaded ${this.props.device} detected preview-section-1`}>
            <main id="page" className="page ng-scope">
              <div className="wide column-3 backdrop for-section-1"></div>
              <div className="wide section-header backdrop"></div>
              <div className="column-1">
                <a href="/" className="uplevel pjax">
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
                  <h1 className="section-title">Work</h1>
                  <span className="smaller alive icon section-1-icon">
                    <span className="bar one"></span>
                    <span className="bar two"></span>
                    <span className="bar three"></span>
                  </span>
              </a>
              <dl className="stats section-1-stats">
                <dt>PI</dt>
                <dd>3.1416</dd>
              </dl>
            </div>
            <div className="l1 level-1-container client-screen">
              <div className="wide column-3">
                <header className="wide section-header section-1-header">
                  <div className="map-container">
                    <a style={{left: 642, top: 232}} className="pjax blip go-to-day positioned showing">
                      <span className="circle-1"></span>
                      <span className="circle-2"></span>
                      <span className="circle-3"></span>
                      <span className="circle">
                        <img className="symbol"/>
                      </span>
                    </a>
                    <div className="map-goes-here"></div>
                  </div>
                  <div className="current-location">
                    <h3>Coded in</h3>
                    <h1><a>Sydney</a></h1>
                    <div className="lat-long">
                      <span className="lat">
                        <small>Latitude</small>
                        <span className="value">33.520413</span>
                      </span>
                      <span className="long">
                        <small>Longitude</small>
                        <span className="value">151.122633</span>
                      </span>
                    </div>
                  </div>
                </header>
                <section className="content">
                  <div className="clients-list">
                    {sortedClients.map((client, index ) => (
                      <a href={client.url} target="_blank" rel="nofollow" key={index}>
                        <div className="client-example">
                          <h2 className="client-title">
                            <div className="client-name">{client.name}</div>
                            <ul className="tags">
                              <li className="tag">{client.tags}</li>
                            </ul>
                          </h2>
                          <div className="client-url">
                            <div className="text">
                              <small>
                                <div>{client.url}</div>
                              </small>
                            </div>
                          </div>
                          <div className="client-photos">
                            <div className="photo">
                              <img src={client.photo} alt="Client Photo" onError={(e)=>{e.target.onerror = null; e.target.src='../images/thumbnails/400x221.png'}}/>
                            </div>
                          </div>
                          {/*<small><div className="client-description">{client.description}</div></small>*/}
                        </div>
                      </a>
                    ))}
                  </div>
                </section>
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
          </main>
        </div>
      </section>
    </div>
    )
  }
}

const mapStateToProps = state => ({
  clients: state.app.clients,
  device: state.app.device
})

const mapDispatchToProps = dispatch => ({
  getClients: () => dispatch(getClients()),
})

export default connect(mapStateToProps, mapDispatchToProps)(Software)
