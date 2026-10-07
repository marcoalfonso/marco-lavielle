// The handlers posts and clients share: list, find by a field, create,
// update and delete, for any model.

// An id that isn't a valid ObjectId finds nothing, rather than failing.
const isCastError = (err) => err && err.name === 'CastError';

// Mongo's duplicate-key error, reported as e.g. "Error: Duplicate Post".
const duplicate = (err, label) => (err && err.code === 11000 ? new Error(`Duplicate ${label}`) : err);

module.exports = (Model, label) => ({
	list: async (req, res) => {
		res.send(await Model.find({}));
	},

	findBy: (field, param = field) => async (req, res) => {
		try {
			res.send(await Model.findOne({ [field]: req.params[param] }));
		} catch (err) {
			if (!isCastError(err)) throw err;
			res.send(null);
		}
	},

	create: async (req, res) => {
		try {
			res.send(await Model.create(req.body));
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
			if (!result.matchedCount) return res.status(404).send({ reason: 'Not found' });
			res.send({ success: true });
		} catch (err) {
			res.status(400).send({ reason: err.toString() });
		}
	},

	remove: async (req, res) => {
		try {
			res.send(await Model.findByIdAndDelete(req.params.id));
		} catch (err) {
			if (!isCastError(err)) throw err;
			res.send(null);
		}
	},
});
