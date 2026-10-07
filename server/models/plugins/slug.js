// Gives a schema a URL slug made from another field ("My Post!" ->
// "my-post"), unique within the collection: a clash becomes "my-post-2",
// then "my-post-3"... (Replaces the monguurl plugin, keeping its slugs.)

// letters that don't split into a base letter and an accent
const LETTERS = { ß: 'ss', æ: 'ae', ø: 'oe', œ: 'oe', đ: 'd', ł: 'l', þ: 'th', ð: 'd' };

const slugify = (text) =>
	String(text || '')
		.toLowerCase()
		.replace(/[ßæøœđłþð]/g, (ch) => LETTERS[ch])
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9\s-]/g, '')
		.trim()
		.replace(/[\s-]+/g, '-');

const nextSlug = (slug) =>
	/-[0-9]{1,2}$/.test(slug) ? slug.replace(/-([0-9]{1,2})$/, (m, n) => `-${Number(n) + 1}`) : `${slug}-2`;

const slugPlugin = (schema, { source, target = 'slug' }) => {
	schema.pre('save', async function makeUniqueSlug() {
		let slug = slugify(this.get(target) || this.get(source));
		const Model = this.constructor;
		// eslint-disable-next-line no-await-in-loop
		while (await Model.exists({ [target]: slug, _id: { $ne: this._id } })) slug = nextSlug(slug);
		this.set(target, slug);
	});
};

module.exports = slugPlugin;
module.exports.slugify = slugify;
