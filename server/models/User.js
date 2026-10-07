const mongoose = require("mongoose");
const encrypt = require("../utilities/encryption");

const userSchema = new mongoose.Schema({
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
  transform: (doc, ret) => {
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
const User = mongoose.model("User", userSchema);

// No accounts with known passwords are ever seeded. On an empty database an
// admin is created only when SEED_ADMIN_PASSWORD is set; otherwise use
// `node scripts/set-password.js <username> --create-admin`.
User.createDefaultUsers = async () => {
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) return;
  if (password.length < encrypt.MIN_PASSWORD_LENGTH) {
    console.warn(`SEED_ADMIN_PASSWORD is shorter than ${encrypt.MIN_PASSWORD_LENGTH} characters; no admin seeded.`);
    return;
  }
  if ((await User.countDocuments()) > 0) return;
  const admin = new User({
    firstName: "Marco",
    lastName: "Lavielle",
    username: process.env.SEED_ADMIN_USERNAME || "marco",
    roles: ["admin"],
  });
  admin.setPassword(password);
  await admin.save();
};

module.exports = User;
