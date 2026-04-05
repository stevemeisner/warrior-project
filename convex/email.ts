import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { render } from "@react-email/components";
import * as React from "react";
import {
  WelcomeEmail,
  StatusChangeEmail,
  NewMessageEmail,
  SupportRequestEmail,
  CaregiverInviteEmail,
} from "./emailTemplates";

// Helper to send via Resend API
async function sendViaResend(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return { success: false, error: "API key not configured" };
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
        to,
        subject,
        html,
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
}

// Send email action (public)
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
    let subject: string;
    let html: string;

    switch (args.template) {
      case "welcome":
        subject = "Welcome to Warrior Project!";
        html = await render(React.createElement(WelcomeEmail, { name: args.data.name }));
        break;
      case "statusChange":
        subject = `${args.data.warriorName}'s status update: ${args.data.status}`;
        html = await render(
          React.createElement(StatusChangeEmail, {
            warriorName: args.data.warriorName,
            status: args.data.status,
            context: args.data.context,
          })
        );
        break;
      case "newMessage":
        subject = `New message from ${args.data.senderName}`;
        html = await render(
          React.createElement(NewMessageEmail, {
            senderName: args.data.senderName,
            preview: args.data.preview,
          })
        );
        break;
      case "supportRequest":
        subject = `${args.data.familyName} could use some support`;
        html = await render(
          React.createElement(SupportRequestEmail, {
            familyName: args.data.familyName,
            helpTypes: args.data.helpTypes,
            location: args.data.location,
          })
        );
        break;
      case "caregiverInvite":
        subject = `${args.data.familyName} invited you to be a caregiver`;
        html = await render(
          React.createElement(CaregiverInviteEmail, {
            familyName: args.data.familyName,
            permissions: args.data.permissions,
          })
        );
        break;
      default:
        return { success: false, error: "Unknown template" };
    }

    return sendViaResend(args.to, subject, html);
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
    const subject = `${args.warriorName}'s status update: ${args.status}`;
    const html = await render(
      React.createElement(StatusChangeEmail, {
        warriorName: args.warriorName,
        status: args.status,
        context: args.context,
      })
    );
    const result = await sendViaResend(args.toEmail, subject, html);
    if (result.success) console.log(`Status change email sent to ${args.toEmail}`);
    return result;
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
    const subject = `New message from ${args.senderName}`;
    const html = await render(
      React.createElement(NewMessageEmail, {
        senderName: args.senderName,
        preview: args.preview,
      })
    );
    const result = await sendViaResend(args.toEmail, subject, html);
    if (result.success) console.log(`New message email sent to ${args.toEmail}`);
    return result;
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
    const subject = `${args.familyName} could use some support`;
    const html = await render(
      React.createElement(SupportRequestEmail, {
        familyName: args.familyName,
        helpTypes: args.helpTypes,
        location: args.location,
      })
    );
    const result = await sendViaResend(args.toEmail, subject, html);
    if (result.success) console.log(`Support request email sent to ${args.toEmail}`);
    return result;
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
    const subject = `${args.inviterName} invited you to be a caregiver`;
    const html = await render(
      React.createElement(CaregiverInviteEmail, {
        familyName: args.inviterName,
        permissions: args.permissions,
      })
    );
    const result = await sendViaResend(args.toEmail, subject, html);
    if (result.success) console.log(`Caregiver invite email sent to ${args.toEmail}`);
    return result;
  },
});
