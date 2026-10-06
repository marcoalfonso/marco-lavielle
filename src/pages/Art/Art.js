import React, { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
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

const Art = () => {
  const all = useSelector((state) => state.app.paintings)
  const [paintings] = useState(() => shuffle(all))
  const [index, setIndex] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [small] = useState(isSmallScreen)
  const menuRef = useRef(null)
  const latest = useRef({ index, paintings })
  latest.current = { index, paintings }

  const imageSrc = (painting) => (small ? smallSrc(painting) : painting.link)

  const next = () => setIndex((i) => (i + 1) % paintings.length)
  const prev = () => setIndex((i) => (i - 1 + paintings.length) % paintings.length)

  // phones: the menu is a pill that drops the links down over the page
  const toggleMenu = () => setMenuOpen((open) => !open)
  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeMenu()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    const onOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) closeMenu()
    }
    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onOutside)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onOutside)
    }
  }, [])

  // Once the painting on show has loaded, fetch its neighbours so switching
  // doesn't wait on the network (not before: they'd compete with it).
  const preloadAround = () => {
    const { index: at, paintings: list } = latest.current
    ;[1, -1].forEach((step) => {
      const img = new Image()
      img.src = imageSrc(list[(at + step + list.length) % list.length])
    })
  }

  const painting = paintings[index]
  const forSale = painting.status === 'For Sale'

  return (
    <div className="art-page">
      <header className="art-menu">
        <a href="/" className="art-name" aria-label="Marco Lavielle, home">
          <BrushName className="art-name-svg" />
        </a>
        <div className={menuOpen ? 'art-menu-drop is-open' : 'art-menu-drop'} ref={menuRef}>
          <button
            type="button"
            className="art-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="art-nav"
            onClick={toggleMenu}
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
                onClick={closeMenu}
              >
                <span className="art-nav-index">{pad(i + 1)}</span>
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <PaintingStage
        src={imageSrc(painting)}
        spillSrc={smallSrc(painting)}
        scale={painting.scale}
        name={paintingName(painting)}
        index={index}
        onLoaded={preloadAround}
        onNext={next}
        onPrev={prev}
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
          <button type="button" className="art-arrow" onClick={prev} aria-label="Previous painting">
            <span aria-hidden="true">&lsaquo;</span>
          </button>
          <span className="art-counter" aria-live="polite">
            <span className="art-counter-current">{pad(index + 1)}</span>
            <span className="art-counter-total"> / {pad(paintings.length)}</span>
          </span>
          <button type="button" className="art-arrow" onClick={next} aria-label="Next painting">
            <span aria-hidden="true">&rsaquo;</span>
          </button>
        </div>
      </footer>
    </div>
  )
}

export default Art
