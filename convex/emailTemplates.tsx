import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Section,
  Hr,
} from "@react-email/components";
import * as React from "react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://warriorproject.com";

const styles = {
  body: { fontFamily: "sans-serif", backgroundColor: "#f9fafb" },
  container: { maxWidth: "600px", margin: "0 auto", padding: "20px" },
  heading: { color: "#1a7a6a", fontSize: "24px" },
  text: { color: "#333", fontSize: "16px", lineHeight: "1.5" },
  muted: { color: "#666", fontSize: "14px", lineHeight: "1.5" },
  italic: { color: "#666", fontStyle: "italic" as const, fontSize: "16px" },
  button: {
    backgroundColor: "#1a7a6a",
    color: "#ffffff",
    padding: "12px 24px",
    borderRadius: "8px",
    textDecoration: "none",
    fontSize: "16px",
    fontWeight: "600" as const,
  },
  purpleButton: {
    backgroundColor: "#9b7ebd",
    color: "#ffffff",
    padding: "12px 24px",
    borderRadius: "8px",
    textDecoration: "none",
    fontSize: "16px",
    fontWeight: "600" as const,
  },
  preview: {
    backgroundColor: "#f5f5f5",
    padding: "16px",
    borderRadius: "8px",
    margin: "16px 0",
  },
};

export function WelcomeEmail({ name }: { name: string }) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Welcome to Warrior Project, {name}!</Heading>
          <Text style={styles.text}>
            We're so glad you've joined our community of families and caregivers
            supporting special needs children.
          </Text>
          <Text style={styles.text}>Here's what you can do:</Text>
          <Text style={styles.text}>
            - Add your warrior(s) to your profile{"\n"}
            - Share status updates with your community{"\n"}
            - Connect with other families on the map{"\n"}
            - Join discussions in our community forums
          </Text>
          <Text style={styles.text}>Remember, you're not alone on this journey.</Text>
          <Section style={{ marginTop: "30px" }}>
            <Button href={`${APP_URL}/dashboard`} style={styles.button}>
              Go to Dashboard
            </Button>
          </Section>
          <Hr />
          <Text style={styles.muted}>With love, The Warrior Project Team</Text>
        </Container>
      </Body>
    </Html>
  );
}

export function StatusChangeEmail({
  warriorName,
  status,
  context,
}: {
  warriorName: string;
  status: string;
  context?: string;
}) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Status Update</Heading>
          <Text style={styles.text}>
            <strong>{warriorName}</strong> is now <strong>{status}</strong>.
          </Text>
          {context && <Text style={styles.italic}>"{context}"</Text>}
          <Section style={{ marginTop: "30px" }}>
            <Button href={`${APP_URL}/dashboard`} style={styles.button}>
              View Dashboard
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function NewMessageEmail({
  senderName,
  preview,
}: {
  senderName: string;
  preview: string;
}) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>New Message</Heading>
          <Text style={styles.text}>
            You have a new message from <strong>{senderName}</strong>:
          </Text>
          <Section style={styles.preview}>
            <Text style={{ margin: 0, color: "#333" }}>{preview}</Text>
          </Section>
          <Section style={{ marginTop: "30px" }}>
            <Button href={`${APP_URL}/messages`} style={styles.button}>
              View Messages
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function SupportRequestEmail({
  familyName,
  helpTypes,
  location,
}: {
  familyName: string;
  helpTypes: string[];
  location?: string;
}) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={{ ...styles.heading, color: "#9b7ebd" }}>
            Support Request
          </Heading>
          <Text style={styles.text}>
            <strong>{familyName}</strong> has indicated they could use some help.
          </Text>
          {helpTypes.length > 0 && (
            <>
              <Text style={styles.text}>They're looking for help with:</Text>
              {helpTypes.map((t, i) => (
                <Text key={i} style={{ ...styles.text, margin: "4px 0", paddingLeft: "16px" }}>
                  • {t}
                </Text>
              ))}
            </>
          )}
          {location && <Text style={styles.text}>Location: {location}</Text>}
          <Section style={{ marginTop: "30px" }}>
            <Button href={`${APP_URL}/map`} style={styles.purpleButton}>
              View on Map
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function CaregiverInviteEmail({
  familyName,
  permissions,
}: {
  familyName: string;
  permissions: string;
}) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Caregiver Invitation</Heading>
          <Text style={styles.text}>
            <strong>{familyName}</strong> has invited you to help care for their
            warrior on Warrior Project.
          </Text>
          <Text style={styles.text}>
            You'll have <strong>{permissions}</strong> access.
          </Text>
          <Section style={{ marginTop: "30px" }}>
            <Button href={`${APP_URL}/signin`} style={styles.button}>
              Accept Invitation
            </Button>
          </Section>
          <Text style={styles.muted}>
            If you don't have an account yet, you can create one after clicking
            the link above.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
