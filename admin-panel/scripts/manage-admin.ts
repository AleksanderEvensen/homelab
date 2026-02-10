#!/usr/bin/env bun
/**
 * Admin account management script.
 *
 * Usage:
 *   bun scripts/manage-admin.ts create          # Create the default admin account
 *   bun scripts/manage-admin.ts change-password  # Change the admin account password
 */

import { password, confirm } from "@inquirer/prompts";
import { auth } from "../src/lib/auth";
import "../src/env";

const ADMIN_USERNAME = "admin";
const ADMIN_NAME = "Admin";
// Better Auth requires an email field - use a placeholder since we auth via username
const ADMIN_EMAIL = "ahse03@gmail.com";

async function promptPassword(message = "Password") {
  const value = await password({
    message,
    mask: "*",
    validate: (v) => (v.length < 8 ? "Password must be at least 8 characters" : true),
  });

  const confirmed = await password({ message: "Confirm password", mask: "*" });

  if (value !== confirmed) {
    console.error("Error: Passwords do not match.");
    process.exit(1);
  }

  return value;
}

async function createAdmin() {
  console.log(`\nCreating admin account: ${ADMIN_USERNAME}\n`);

  const pw = await promptPassword();

  try {
    const result = await auth.api.signUpEmail({
      body: {
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        password: pw,
        name: ADMIN_NAME,
      },
    });

    if (!result || ("error" in result && result.error)) {
      console.error("Failed to create admin account:", result);
      process.exit(1);
    }

    console.log(`\nAdmin account created successfully.`);
    console.log(`  Username: ${ADMIN_USERNAME}`);
  } catch (err) {
    if (err instanceof Error && err.message.includes("already exists")) {
      console.error(`\nError: Account "${ADMIN_USERNAME}" already exists.`);
      console.error("Use 'change-password' to update the password instead.");
    } else {
      console.error("Error creating account:", err);
    }
    process.exit(1);
  }
}

async function changePassword() {
  console.log(`\nChanging password for: ${ADMIN_USERNAME}\n`);

  const ctx = await auth.$context;
  const found = await ctx.internalAdapter.findUserByEmail(ADMIN_EMAIL);

  if (!found) {
    console.error(`Error: No account found for "${ADMIN_USERNAME}".`);
    console.error("Use 'create' to create the admin account first.");
    process.exit(1);
  }

  const proceed = await confirm({
    message: `Reset password for "${ADMIN_USERNAME}"?`,
    default: true,
  });

  if (!proceed) {
    console.log("Cancelled.");
    process.exit(0);
  }

  const pw = await promptPassword("New password");

  try {
    const hashedPassword = await ctx.password.hash(pw);
    await ctx.internalAdapter.updatePassword(found.user.id, hashedPassword);
    console.log("\nPassword changed successfully.");
  } catch (err) {
    console.error("Error changing password:", err);
    process.exit(1);
  }
}

// --- Main ---

const command = process.argv[2];

switch (command) {
  case "create":
    await createAdmin();
    break;
  case "change-password":
    await changePassword();
    break;
  default:
    console.log("Usage:");
    console.log("  bun scripts/manage-admin.ts create           Create the default admin account");
    console.log("  bun scripts/manage-admin.ts change-password   Change the admin password");
    process.exit(command ? 1 : 0);
}

process.exit(0);
