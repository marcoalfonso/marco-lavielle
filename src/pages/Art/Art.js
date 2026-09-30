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
  { href: '/software', label: 'Software' },
  { href: '/art', label: 'Paintings', active: true },
  { href: '/journal', label: 'Thoughts' },
  { href: '/about', label: 'Contact' },
]

// Every painting also has a 960px-wide copy ("name-960.jpg"): phones get it
// in place of the full-size image, and the platform's blurred colour spill
// always uses it.
const smallSrc = (painting) => painting.link.replace(/\.jpg$/, '-960.jpg')
const isSmallScreen = () => window.matchMedia && window.matchMedia('(max-width: 700px)').matches

// a fresh order on every page load
const shuffle = (list) => {
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export class Art extends Component {
  state = { index: 0, paintings: shuffle(this.props.paintings), menuOpen: false }

  menuRef = React.createRef()

  small = isSmallScreen()

  imageSrc = (painting) => (this.small ? smallSrc(painting) : painting.link)

  componentDidMount() {
    window.addEventListener('keydown', this.onKeyDown)
    document.addEventListener('pointerdown', this.onOutside)
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onKeyDown)
    document.removeEventListener('pointerdown', this.onOutside)
  }

  // phones: the menu is a pill that drops the links down over the page
  toggleMenu = () => this.setState(({ menuOpen }) => ({ menuOpen: !menuOpen }))

  closeMenu = () => this.setState({ menuOpen: false })

  onOutside = (e) => {
    if (this.state.menuOpen && this.menuRef.current && !this.menuRef.current.contains(e.target)) this.closeMenu()
  }

  // Once the painting on show has loaded, fetch its neighbours so switching
  // doesn't wait on the network (not before: they'd compete with it).
  preloadAround = () => {
    const { index, paintings, menuOpen } = this.state
    ;[1, -1].forEach((step) => {
      const img = new Image()
      img.src = this.imageSrc(paintings[(index + step + paintings.length) % paintings.length])
    })
  }

  onKeyDown = (e) => {
    if (e.key === 'Escape') this.closeMenu()
    else if (e.key === 'ArrowRight') this.onClickForward()
    else if (e.key === 'ArrowLeft') this.onClickBack()
  }

  onClickForward = () => {
    this.setState(({ index, paintings }) => ({ index: (index + 1) % paintings.length }))
  }

  onClickBack = () => {
    this.setState(({ index, paintings }) => ({ index: (index - 1 + paintings.length) % paintings.length }))
  }

  render() {
    const { index, paintings, menuOpen } = this.state
    const painting = paintings[index]
    const forSale = painting.status === 'For Sale'

    return (
      <div className="art-page">
        <header className="art-menu">
          <a href="/" className="art-name" aria-label="Marco Lavielle, home">
            <BrushName className="art-name-svg" />
          </a>
          <div className={menuOpen ? 'art-menu-drop is-open' : 'art-menu-drop'} ref={this.menuRef}>
            <button
              type="button"
              className="art-menu-toggle"
              aria-expanded={menuOpen}
              aria-controls="art-nav"
              onClick={this.toggleMenu}
            >
              <span className="art-menu-toggle-icon" aria-hidden="true">
                <span />
                <span />
              </span>
              {menuOpen ? 'Close' : 'Menu'}
            </button>
            <nav className="art-nav" id="art-nav">
              {NAV.map((item, i) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={item.active ? 'active' : undefined}
                  aria-current={item.active ? 'page' : undefined}
                  onClick={this.closeMenu}
                >
                  <span className="art-nav-index">{pad(i + 1)}</span>
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </header>

        <PaintingStage
          src={this.imageSrc(painting)}
          spillSrc={smallSrc(painting)}
          name={paintingName(painting)}
          index={index}
          onLoaded={this.preloadAround}
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
