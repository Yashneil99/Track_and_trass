const bcrypt = require('bcryptjs');

// Same library and cost as the old server, so users converted from the old
// database keep working with their existing passwords.
const COST = 10;

const hashPassword = (plain) => bcrypt.hash(plain, COST);
const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

module.exports = { hashPassword, verifyPassword };
