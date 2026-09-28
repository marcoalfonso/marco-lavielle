var crypto = require('crypto');

// New hashes are scrypt, stored as "scrypt$<hex>". Hashes without the prefix
// are the old HMAC-SHA1 format; they still verify so existing users can log
// in, and are upgraded to scrypt on their next successful login.
var SCRYPT_PREFIX = 'scrypt$';
var KEY_LENGTH = 64;

exports.MIN_PASSWORD_LENGTH = 12;

exports.createSalt = function() {
	return crypto.randomBytes(32).toString('base64');
};

exports.hashPwd = function(salt, pwd) {
	return SCRYPT_PREFIX + crypto.scryptSync(pwd, salt, KEY_LENGTH).toString('hex');
};

function legacyHashPwd(salt, pwd) {
	var hmac = crypto.createHmac('sha1', salt);
	return hmac.update(pwd).digest('hex');
}

exports.isLegacyHash = function(hashed) {
	return typeof hashed === 'string' && hashed.indexOf(SCRYPT_PREFIX) !== 0;
};

exports.verifyPwd = function(salt, hashed, pwd) {
	if (typeof pwd !== 'string' || typeof hashed !== 'string' || !salt) return false;
	var candidate = exports.isLegacyHash(hashed) ? legacyHashPwd(salt, pwd) : exports.hashPwd(salt, pwd);
	var a = Buffer.from(candidate);
	var b = Buffer.from(hashed);
	return a.length === b.length && crypto.timingSafeEqual(a, b);
};
