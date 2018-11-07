import React, { Component } from 'react'
import { connect } from 'react-redux'
import styles from './Art.scss'

export class Art extends Component {
  render() {
    return (
      <div className={styles.container}>
        <div className={styles.window}>
          <div className={styles.terminal}>
            <p className={styles.command}>git clone https://github.com/marcoalfonso/art</p>
            <p className={styles.log}>
              <span>
                Cloning into 'art'...<br />
                remote: Reusing existing pack: 1857, done.<br />
                remote: Total 1857 (delta 0), reused 0 (delta 0)<br />
                Receiving objects: 100% (1857/1857), 374.35 KiB | 268.00 KiB/s, done.<br />
                Resolving deltas: 100% (772/772), done.<br />
                Checking connectivity... done.
              </span>
            </p>
            <p className={styles.command}>rm -rf art</p>
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
