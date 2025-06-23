var mongoose = require("mongoose");
var crypto = require("crypto");

// Connect to MongoDB (adjust connection string as needed)
mongoose.connect(process.env.DB_URI || "mongodb://localhost/marco-lavielle");

var userSchema = mongoose.Schema({
  firstName: { type: String, required: "{PATH} is required!" },
  lastName: { type: String, required: "{PATH} is required!" },
  username: { type: String, required: "{PATH} is required", unique: true },
  salt: { type: String, required: "{PATH} is required!" },
  hashed_pwd: { type: String, required: "{PATH} is required!" },
  roles: [String],
});

var User = mongoose.model("User", userSchema);

function createSalt() {
  return crypto.randomBytes(128).toString("base64");
}

function hashPwd(salt, pwd) {
  var hmac = crypto.createHmac("sha1", salt);
  return hmac.update(pwd).digest("hex");
}

// Create admin user
var salt = createSalt();
var hash = hashPwd(salt, "marco"); // Change password here

User.create({
  firstName: "Marco",
  lastName: "Lavielle",
  username: "marco",
  salt: salt,
  hashed_pwd: hash,
  roles: ["admin"],
})
  .then(() => {
    console.log("Admin user created successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error creating admin user:", err);
    process.exit(1);
  });
