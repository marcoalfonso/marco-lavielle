const Post = require('../models/Post');
const crud = require('./crud')(Post, 'Post');

exports.getPosts = crud.list;
exports.getPostById = crud.findBy('_id', 'id');
exports.getPostBySlug = crud.findBy('slug');
exports.createPost = crud.create;
exports.updatePost = crud.update;
exports.deletePostById = crud.remove;
