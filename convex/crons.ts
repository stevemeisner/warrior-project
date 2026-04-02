import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up expired typing indicators every 5 minutes
crons.interval("cleanup typing indicators", { minutes: 5 }, internal.typing.cleanupExpired);

// Clean up old read notifications every 24 hours (older than 30 days)
crons.interval("cleanup old notifications", { hours: 24 }, internal.notifications.clearOldNotifications, { olderThanDays: 30 });

export default crons;
