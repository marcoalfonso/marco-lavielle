const Client = require('../models/Client');
const crud = require('./crud')(Client, 'Client');

exports.getClients = crud.list;
exports.getClientById = crud.findBy('_id', 'id');
exports.createClient = crud.create;
exports.updateClient = crud.update;
exports.deleteClientById = crud.remove;
