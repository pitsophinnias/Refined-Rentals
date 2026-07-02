/**
 * seed.js
 * Creates the admin user. Run once: npm run seed
 */

require("dotenv").config();
const bcrypt     = require("bcrypt");
const { pool, initDB } = require("./db.js");

async function seed() {
  await initDB();

  const email    = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("✗ Set ADMIN_EMAIL and ADMIN_PASSWORD in .env");
    process.exit(1);
  }

  try {
    // Check if admin already exists
    const { rows } = await pool.query(
      "SELECT id FROM admins WHERE email = $1",
      [email.toLowerCase()]
    );

    if (rows.length > 0) {
      console.log(`ℹ Admin already exists: ${email}`);
      process.exit(0);
    }

    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      "INSERT INTO admins (email, password_hash) VALUES ($1, $2)",
      [email.toLowerCase(), hash]
    );

    console.log(`✓ Admin created: ${email}`);
    console.log(`  Password: ${password}`);
    console.log("\nYou can now start the server with: npm run dev");
    process.exit(0);
  } catch (err) {
    console.error("✗ Seed failed:", err.message);
    process.exit(1);
  }
}

seed();