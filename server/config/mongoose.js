var mongoose = require("mongoose"),
  userModel = require("../models/User");
clientModel = require("../models/Client");
postModel = require("../models/Post");

mongoose.set("strictQuery", false);

module.exports = function (config) {
  mongoose.connect(config.db, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  var db = mongoose.connection;
  db.on("error", console.error.bind(console, "connection error.."));
  db.once("open", function callback() {
    console.log("marco lavielle db opened");
  });

  userModel.createDefaultUsers();
  clientModel.createDefaultClients();
  postModel.createDefaultPosts();
  console.log(mongoose.connection.readyState);
};
