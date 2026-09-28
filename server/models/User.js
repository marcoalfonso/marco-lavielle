var mongoose = require("mongoose"),
  encrypt = require("../utilities/encryption");

var userSchema = mongoose.Schema({
  firstName: { type: String, required: "{PATH} is required!" },
  lastName: { type: String, required: "{PATH} is required!" },
  username: {
    type: String,
    required: "{PATH} is required",
    unique: true,
  },
  salt: { type: String, required: "{PATH} is required!" },
  hashed_pwd: { type: String, required: "{PATH} is required!" },
  roles: [String],
});

// Never send password material to the client (API responses, login reply).
userSchema.set("toJSON", {
  transform: function (doc, ret) {
    delete ret.salt;
    delete ret.hashed_pwd;
    return ret;
  },
});

userSchema.methods = {
  authenticate: function (passwordToMatch) {
    return encrypt.verifyPwd(this.salt, this.hashed_pwd, passwordToMatch);
  },
  needsRehash: function () {
    return encrypt.isLegacyHash(this.hashed_pwd);
  },
  setPassword: function (password) {
    this.salt = encrypt.createSalt();
    this.hashed_pwd = encrypt.hashPwd(this.salt, password);
  },
  hasRole: function (role) {
    return (this.roles || []).indexOf(role) > -1;
  },
};
var User = mongoose.model("User", userSchema);

// No accounts with known passwords are ever seeded. On an empty database an
// admin is created only when SEED_ADMIN_PASSWORD is set; otherwise use
// `node scripts/set-password.js <username> --create-admin`.
function createDefaultUsers() {
  var password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) return;
  if (password.length < encrypt.MIN_PASSWORD_LENGTH) {
    console.warn(
      "SEED_ADMIN_PASSWORD is shorter than " +
        encrypt.MIN_PASSWORD_LENGTH +
        " characters; no admin seeded.",
    );
    return;
  }
  User.countDocuments({}).exec(function (err, count) {
    if (err || count > 0) return;
    var admin = new User({
      firstName: "Marco",
      lastName: "Lavielle",
      username: process.env.SEED_ADMIN_USERNAME || "marco",
      roles: ["admin"],
    });
    admin.setPassword(password);
    admin.save();
  });
}

exports.createDefaultUsers = createDefaultUsers;
