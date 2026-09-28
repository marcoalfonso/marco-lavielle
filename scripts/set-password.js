// Set (or reset) a user's password. The password is typed at a hidden prompt,
// never passed on the command line, so it stays out of shell history and logs.
//
//   node scripts/set-password.js <username>                 reset an existing user
//   node scripts/set-password.js <username> --create-admin  create the admin if missing
//
// On Heroku (uses the app's DB_URI):
//   heroku run node scripts/set-password.js marco
var path = require("path");
var readline = require("readline");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env.local") });
var mongoose = require("mongoose");
var encrypt = require("../server/utilities/encryption");
require("../server/models/User");
var User = mongoose.model("User");

var args = process.argv.slice(2);
var username = (args.find(function (a) { return a.indexOf("--") !== 0; }) || "").toLowerCase();
var createAdmin = args.indexOf("--create-admin") > -1;

if (!username) {
  console.error("Usage: node scripts/set-password.js <username> [--create-admin]");
  process.exit(1);
}

var dbUri = process.env.DB_URI || "mongodb://localhost/marco_lavielle";

// Ask a question without echoing what is typed.
function askHidden(question) {
  return new Promise(function (resolve) {
    var rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    var muted = false;
    rl._writeToOutput = function (text) {
      if (!muted) rl.output.write(text);
    };
    rl.question(question, function (answer) {
      rl.output.write("\n");
      rl.close();
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  await mongoose.connect(dbUri);
  var user = await User.findOne({ username: username });
  if (!user && !createAdmin) {
    throw new Error('No user "' + username + '" found. Pass --create-admin to create it.');
  }

  var password = await askHidden("New password for " + username + ": ");
  if (password.length < encrypt.MIN_PASSWORD_LENGTH) {
    throw new Error("Password must be at least " + encrypt.MIN_PASSWORD_LENGTH + " characters.");
  }
  var confirm = await askHidden("Repeat password: ");
  if (password !== confirm) throw new Error("Passwords do not match.");

  if (!user) {
    user = new User({ firstName: "Marco", lastName: "Lavielle", username: username, roles: ["admin"] });
  }
  user.setPassword(password);
  await user.save();
  console.log('Password updated for "' + username + '".');
}

main()
  .then(function () {
    return mongoose.disconnect();
  })
  .catch(function (err) {
    console.error(err.message);
    mongoose.disconnect();
    process.exitCode = 1;
  });
