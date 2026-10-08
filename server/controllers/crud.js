// The handlers posts and clients share: list, find by a field, create,
// update and delete, for any model.
//
// Reads are cached in memory for a minute, so a crowd of visitors doesn't
// each hit the database; any create, update or delete clears the model's
// cache at once, so edits show straight away. (One dyno, so one cache; with
// more dynos, another dyno's readers could see an edit up to a minute late.)
const CACHE_MS = 60 * 1000;

// An id that isn't a valid ObjectId finds nothing, rather than failing.
const isCastError = (err) => err && err.name === 'CastError';

// Mongo's duplicate-key error, reported as e.g. "Error: Duplicate Post".
const duplicate = (err, label) => (err && err.code === 11000 ? new Error(`Duplicate ${label}`) : err);

module.exports = (Model, label) => {
	const cache = new Map();
	const cached = async (key, load) => {
		const hit = cache.get(key);
		if (hit && hit.expires > Date.now()) return hit.value;
		const value = await load();
		// plain objects, so a cached value can't be changed by later code
		const plain = JSON.parse(JSON.stringify(value));
		cache.set(key, { value: plain, expires: Date.now() + CACHE_MS });
		return plain;
	};
	// a write: drop everything cached for this model
	const changed = () => cache.clear();

	return {
		list: async (req, res) => {
			res.send(await cached('list', () => Model.find({})));
		},

		findBy: (field, param = field) => async (req, res) => {
			const value = req.params[param];
			try {
				res.send(await cached(`${field}:${value}`, () => Model.findOne({ [field]: value })));
			} catch (err) {
				if (!isCastError(err)) throw err;
				res.send(null);
			}
		},

		create: async (req, res) => {
			try {
				const doc = await Model.create(req.body);
				changed();
				res.send(doc);
			} catch (err) {
				res.status(400).send({ reason: duplicate(err, label).toString() });
			}
		},

		// Updates an existing record; an unknown id is a 404, not a new record.
		update: async (req, res) => {
			const { _id: id, ...changes } = req.body || {};
			if (!id) return res.status(400).send({ reason: 'Missing _id' });
			try {
				const result = await Model.updateOne({ _id: id }, changes);
				changed();
				if (!result.matchedCount) return res.status(404).send({ reason: 'Not found' });
				res.send({ success: true });
			} catch (err) {
				res.status(400).send({ reason: err.toString() });
			}
		},

		remove: async (req, res) => {
			try {
				const doc = await Model.findByIdAndDelete(req.params.id);
				changed();
				res.send(doc);
			} catch (err) {
				if (!isCastError(err)) throw err;
				res.send(null);
			}
		},
	};
};
