import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";

// Email templates
const emailTemplates = {
  welcome: (name: string) => ({
    subject: "Welcome to Warrior Project!",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a90a4;">Welcome to Warrior Project, ${name}!</h1>
        <p>We're so glad you've joined our community of families and caregivers supporting special needs children.</p>
        <p>Here's what you can do:</p>
        <ul>
          <li>Add your warrior(s) to your profile</li>
          <li>Share status updates with your community</li>
          <li>Connect with other families on the map</li>
          <li>Join discussions in our community forums</li>
        </ul>
        <p>Remember, you're not alone on this journey.</p>
        <p style="margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background: #4a90a4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Go to Dashboard</a>
        </p>
        <p style="color: #666; margin-top: 30px; font-size: 14px;">
          With love,<br/>
          The Warrior Project Team
        </p>
      </div>
    `,
  }),

  statusChange: (warriorName: string, status: string, context?: string) => ({
    subject: `${warriorName}'s status update: ${status}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a90a4;">Status Update</h1>
        <p><strong>${warriorName}</strong> is now <strong>${status}</strong>.</p>
        ${context ? `<p style="color: #666; font-style: italic;">"${context}"</p>` : ""}
        <p style="margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background: #4a90a4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Dashboard</a>
        </p>
      </div>
    `,
  }),

  newMessage: (senderName: string, preview: string) => ({
    subject: `New message from ${senderName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a90a4;">New Message</h1>
        <p>You have a new message from <strong>${senderName}</strong>:</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #333;">${preview}</p>
        </div>
        <p style="margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/messages" style="background: #4a90a4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Messages</a>
        </p>
      </div>
    `,
  }),

  supportRequest: (familyName: string, helpTypes: string[], location?: string) => ({
    subject: `${familyName} could use some support`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #9b7ebd;">Support Request</h1>
        <p><strong>${familyName}</strong> has indicated they could use some help.</p>
        ${helpTypes.length > 0 ? `
          <p>They're looking for help with:</p>
          <ul>
            ${helpTypes.map((t) => `<li>${t}</li>`).join("")}
          </ul>
        ` : ""}
        ${location ? `<p>Location: ${location}</p>` : ""}
        <p style="margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/map" style="background: #9b7ebd; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View on Map</a>
        </p>
      </div>
    `,
  }),

  caregiverInvite: (familyName: string, permissions: string) => ({
    subject: `${familyName} invited you to be a caregiver`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a90a4;">Caregiver Invitation</h1>
        <p><strong>${familyName}</strong> has invited you to help care for their warrior on Warrior Project.</p>
        <p>You'll have <strong>${permissions}</strong> access.</p>
        <p style="margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/signin" style="background: #4a90a4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Accept Invitation</a>
        </p>
        <p style="color: #666; margin-top: 30px; font-size: 14px;">
          If you don't have an account yet, you can create one after clicking the link above.
        </p>
      </div>
    `,
  }),
};

// Send email action
export const sendEmail = action({
  args: {
    to: v.string(),
    template: v.union(
      v.literal("welcome"),
      v.literal("statusChange"),
      v.literal("newMessage"),
      v.literal("supportRequest"),
      v.literal("caregiverInvite")
    ),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY not set, skipping email");
      return { success: false, error: "API key not configured" };
    }

    let emailContent;
    switch (args.template) {
      case "welcome":
        emailContent = emailTemplates.welcome(args.data.name);
        break;
      case "statusChange":
        emailContent = emailTemplates.statusChange(
          args.data.warriorName,
          args.data.status,
          args.data.context
        );
        break;
      case "newMessage":
        emailContent = emailTemplates.newMessage(
          args.data.senderName,
          args.data.preview
        );
        break;
      case "supportRequest":
        emailContent = emailTemplates.supportRequest(
          args.data.familyName,
          args.data.helpTypes,
          args.data.location
        );
        break;
      case "caregiverInvite":
        emailContent = emailTemplates.caregiverInvite(
          args.data.familyName,
          args.data.permissions
        );
        break;
      default:
        return { success: false, error: "Unknown template" };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Warrior Project <noreply@warriorproject.com>",
          to: args.to,
          subject: emailContent.subject,
          html: emailContent.html,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Failed to send email:", error);
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      console.error("Email error:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Internal action for status change emails (called via scheduler)
export const sendStatusChangeEmail = internalAction({
  args: {
    toEmail: v.string(),
    warriorName: v.string(),
    status: v.string(),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY not set, skipping status change email");
      return { success: false, error: "API key not configured" };
    }

    const emailContent = emailTemplates.statusChange(args.warriorName, args.status, args.context);

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Warrior Project <noreply@warriorproject.com>",
          to: args.toEmail,
          subject: emailContent.subject,
          html: emailContent.html,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Failed to send status change email:", error);
        return { success: false, error };
      }

      console.log(`Status change email sent to ${args.toEmail}`);
      return { success: true };
    } catch (error) {
      console.error("Status change email error:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Internal action for new message emails (called via scheduler)
export const sendNewMessageEmail = internalAction({
  args: {
    toEmail: v.string(),
    senderName: v.string(),
    preview: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY not set, skipping new message email");
      return { success: false, error: "API key not configured" };
    }

    const emailContent = emailTemplates.newMessage(args.senderName, args.preview);

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Warrior Project <noreply@warriorproject.com>",
          to: args.toEmail,
          subject: emailContent.subject,
          html: emailContent.html,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Failed to send new message email:", error);
        return { success: false, error };
      }

      console.log(`New message email sent to ${args.toEmail}`);
      return { success: true };
    } catch (error) {
      console.error("New message email error:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Internal action for support request emails (called via scheduler)
export const sendSupportRequestEmail = internalAction({
  args: {
    toEmail: v.string(),
    familyName: v.string(),
    helpTypes: v.array(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY not set, skipping support request email");
      return { success: false, error: "API key not configured" };
    }

    const emailContent = emailTemplates.supportRequest(args.familyName, args.helpTypes, args.location);

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Warrior Project <noreply@warriorproject.com>",
          to: args.toEmail,
          subject: emailContent.subject,
          html: emailContent.html,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Failed to send support request email:", error);
        return { success: false, error };
      }

      console.log(`Support request email sent to ${args.toEmail}`);
      return { success: true };
    } catch (error) {
      console.error("Support request email error:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Internal action for caregiver invite emails (called via scheduler)
export const sendCaregiverInviteEmail = internalAction({
  args: {
    toEmail: v.string(),
    inviterName: v.string(),
    permissions: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY not set, skipping caregiver invite email");
      return { success: false, error: "API key not configured" };
    }

    const emailContent = emailTemplates.caregiverInvite(args.inviterName, args.permissions);

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Warrior Project <noreply@warriorproject.com>",
          to: args.toEmail,
          subject: emailContent.subject,
          html: emailContent.html,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Failed to send caregiver invite email:", error);
        return { success: false, error };
      }

      console.log(`Caregiver invite email sent to ${args.toEmail}`);
      return { success: true };
    } catch (error) {
      console.error("Caregiver invite email error:", error);
      return { success: false, error: String(error) };
    }
  },
});
