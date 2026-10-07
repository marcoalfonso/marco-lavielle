const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// Versioned asset URLs: "/dist/bundle.js" -> "/dist/bundle.js?v=1a2b3c4d".
// The version is a hash of the file, worked out once at startup (each deploy
// starts a fresh process), so a changed file gets a new URL and browsers and
// Cloudflare can keep each version for a year.
// In development the bundle is rebuilt while the server runs, so URLs stay
// plain there.
module.exports = (publicDir, { enabled = process.env.NODE_ENV === 'production' } = {}) => {
	const versions = new Map();
	return (url) => {
		if (!enabled) return url;
		if (!versions.has(url)) {
			let version = null;
			try {
				const file = fs.readFileSync(path.join(publicDir, url));
				version = crypto.createHash('sha1').update(file).digest('hex').slice(0, 10);
			} catch (err) {
				// not built yet (development): fall back to the plain URL
			}
			versions.set(url, version);
		}
		const version = versions.get(url);
		return version ? `${url}?v=${version}` : url;
	};
};
