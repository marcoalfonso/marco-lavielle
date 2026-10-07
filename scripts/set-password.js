// Set (or reset) a user's password. The password is typed at a hidden prompt,
// never passed on the command line, so it stays out of shell history and logs.
//
//   node scripts/set-password.js <username>                 reset an existing user
//   node scripts/set-password.js <username> --create-admin  create the admin if missing
//
// On Heroku (uses the app's DB_URI):
//   heroku run node scripts/set-password.js marco
const path = require("node:path");
const readline = require("node:readline");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env.local"), quiet: true });
const mongoose = require("mongoose");
const encrypt = require("../server/utilities/encryption");
const User = require("../server/models/User");

const args = process.argv.slice(2);
const username = (args.find((a) => !a.startsWith("--")) || "").toLowerCase();
const createAdmin = args.includes("--create-admin");

if (!username) {
  console.error("Usage: node scripts/set-password.js <username> [--create-admin]");
  process.exit(1);
}

const dbUri = process.env.DB_URI || "mongodb://localhost/marco_lavielle";

// Ask a question without echoing what is typed.
const askHidden = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    rl._writeToOutput = (text) => {
      if (!muted) rl.output.write(text);
    };
    rl.question(question, (answer) => {
      rl.output.write("\n");
      rl.close();
      resolve(answer);
    });
    muted = true;
  });

const main = async () => {
  await mongoose.connect(dbUri);
  let user = await User.findOne({ username });
  if (!user && !createAdmin) {
    throw new Error(`No user "${username}" found. Pass --create-admin to create it.`);
  }

  const password = await askHidden(`New password for ${username}: `);
  if (password.length < encrypt.MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${encrypt.MIN_PASSWORD_LENGTH} characters.`);
  }
  const confirm = await askHidden("Repeat password: ");
  if (password !== confirm) throw new Error("Passwords do not match.");

  if (!user) {
    user = new User({ firstName: "Marco", lastName: "Lavielle", username, roles: ["admin"] });
  }
  user.setPassword(password);
  await user.save();
  console.log(`Password updated for "${username}".`);
};

main()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error(err.message);
    mongoose.disconnect();
    process.exitCode = 1;
  });
