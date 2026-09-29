import React, { Component } from 'react'
import { connect } from 'react-redux'
import BrushName from './BrushName'
import PaintingStage from './PaintingStage'

const pad = (n) => String(n).padStart(2, '0')

// "../images/paintings/clovelly_beach.jpg" -> "Clovelly beach"
const paintingName = (painting) => {
  const file = painting.link.split('/').pop().replace(/\.[a-z]+$/i, '').replace(/_/g, ' ')
  return file.charAt(0).toUpperCase() + file.slice(1)
}

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/art', label: 'Paintings', active: true },
  { href: '/about', label: 'Contact' },
]

export class Art extends Component {
  state = { index: 0 }

  componentDidMount() {
    window.addEventListener('keydown', this.onKeyDown)
    this.preloadAround(0)
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onKeyDown)
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.index !== this.state.index) this.preloadAround(this.state.index)
  }

  // fetch the neighbours so switching paintings doesn't wait on the network
  preloadAround = (index) => {
    const { paintings } = this.props
    ;[1, -1].forEach((step) => {
      const img = new Image()
      img.src = paintings[(index + step + paintings.length) % paintings.length].link
    })
  }

  onKeyDown = (e) => {
    if (e.key === 'ArrowRight') this.onClickForward()
    else if (e.key === 'ArrowLeft') this.onClickBack()
  }

  onClickForward = () => {
    this.setState(({ index }) => ({ index: (index + 1) % this.props.paintings.length }))
  }

  onClickBack = () => {
    const count = this.props.paintings.length
    this.setState(({ index }) => ({ index: (index - 1 + count) % count }))
  }

  render() {
    const { paintings } = this.props
    const { index } = this.state
    const painting = paintings[index]
    const forSale = painting.status === 'For Sale'

    return (
      <div className="art-page">
        <header className="art-menu">
          <a href="/" className="art-name" aria-label="Marco Lavielle, home">
            <BrushName className="art-name-svg" />
          </a>
          <nav className="art-nav">
            {NAV.map((item, i) => (
              <a
                key={item.href}
                href={item.href}
                className={item.active ? 'active' : undefined}
                aria-current={item.active ? 'page' : undefined}
              >
                <span className="art-nav-index">{pad(i + 1)}</span>
                {item.label}
              </a>
            ))}
          </nav>
        </header>

        <PaintingStage
          painting={painting}
          name={paintingName(painting)}
          index={index}
          onNext={this.onClickForward}
          onPrev={this.onClickBack}
        />

        <footer className="art-hud">
          <div className="art-hud-status">
            <dl className={forSale ? 'art-status is-for-sale' : 'art-status'}>
              <dt>Status</dt>
              <dd>
                <span className="art-status-dot" aria-hidden="true" />
                {forSale ? 'For sale' : painting.status}
              </dd>
            </dl>
            {forSale && (
              <a
                className="art-enquire"
                href={`mailto:marcoalfonso@gmail.com?subject=${encodeURIComponent(`Painting enquiry: ${paintingName(painting)}`)}`}
              >
                Enquire
              </a>
            )}
          </div>
          <div className="art-controls">
            <button type="button" className="art-arrow" onClick={this.onClickBack} aria-label="Previous painting">
              <span aria-hidden="true">&lsaquo;</span>
            </button>
            <span className="art-counter" aria-live="polite">
              <span className="art-counter-current">{pad(index + 1)}</span>
              <span className="art-counter-total"> / {pad(paintings.length)}</span>
            </span>
            <button type="button" className="art-arrow" onClick={this.onClickForward} aria-label="Next painting">
              <span aria-hidden="true">&rsaquo;</span>
            </button>
          </div>
        </footer>
      </div>
    )
  }
}

const mapStateToProps = state => ({
  paintings: state.app.paintings,
})

export default connect(mapStateToProps)(Art)
