const con = require("../config/databaseCon");
const { logger } = require("../utils/logger");

const updateUserSchema = async () => {
  try {

    console.log("Starting user schema update...");
    const checkQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('failed_attempts', 'lockout_until')
    `;


    const result = await con.query(checkQuery);
    console.log(result);
    
    const existingColumns = result.rows.map(row => row.column_name);

    if (!existingColumns.includes('failed_attempts')) {
      await con.query(`
        ALTER TABLE users
        ADD COLUMN failed_attempts INTEGER DEFAULT 0
      `);
      console.log("Added failed_attempts column to users table");
    }

    if (!existingColumns.includes('lockout_until')) {
      await con.query(`
        ALTER TABLE users
        ADD COLUMN lockout_until TIMESTAMP
      `);
      console.log("Added lockout_until column to users table");
    }

    console.log("User schema update completed successfully");
  } catch (error) {
    console.error("Error updating user schema:", error);
    throw error;
  }
};

module.exports = updateUserSchema;
