import React, { Component } from 'react'
import { connect } from 'react-redux'
import { CarouselProvider, Slider, Slide, ButtonBack, ButtonNext, DotGroup } from 'pure-react-carousel'
import axios from 'axios'
import _ from 'underscore'
import styles from './Software.scss'

export class Software extends Component {
  constructor(props) {
    super(props)
    this.state = {
      clients: [],
      width: 0,
      height: 0
    }
  }

  componentDidMount() {
    this.updateWindowDimensions();
    window.addEventListener("resize", this.updateWindowDimensions);
    let self = this
    axios.get('/api/clients')
    .then(function (response) {
      console.log(response.data);
      self.setState({ clients: response.data })
    })
    .catch(function (error) {
      console.log(error)
    });
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.updateWindowDimensions);
  }

  updateWindowDimensions = () => {
    this.setState({ width: window.innerWidth, height: window.innerHeight });
  }

  render() {
    const sortedClients = _.sortBy(this.state.clients, 'name');
    const device = this.state.width > 812 ? 'desktop' : 'mobile';
    return (
      <div className={`home ng-scope loaded detected ` + device + ` level-0`}>
        <section className="content">
          <div id="device-info" className={`ng-scope loaded  ` + device + ` detected preview-section-1`}>
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
                              <img src={client.photo}/>
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
                        About this site ·
                      </a>
                      <a href="http://twitter.com/marcolavielle" target="_blank" rel="nofollow" className="twitter">
                        <span className="logo"> · </span>
                      </a>
                      <a href="http://instagram.com/cuban_papi_chulo" target="_blank" rel="nofollow" className="instagram">
                        <span className="logo"></span>
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
})

const mapDispatchToProps = dispatch => ({
})

export default connect(mapStateToProps, mapDispatchToProps)(Software)
