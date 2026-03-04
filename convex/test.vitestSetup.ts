// Suppress unhandled rejections from convex-test auto-running scheduled actions
// (e.g., email actions that call external APIs fail in test environment)
process.on("unhandledRejection", (reason: unknown) => {
  if (
    reason instanceof Error &&
    reason.message.includes("Write outside of transaction") &&
    reason.message.includes("_scheduled_functions")
  ) {
    // Expected: convex-test tries to auto-run scheduled email actions which fail
    return;
  }
  // Re-throw unexpected rejections
  throw reason;
});
