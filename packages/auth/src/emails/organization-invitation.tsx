/** @jsxImportSource react */
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type OrganizationInvitationProps = {
  invitationUrl: string;
  inviterName: string;
  organizationName: string;
  role: string;
};

export function OrganizationInvitation({
  invitationUrl,
  inviterName,
  organizationName,
  role,
}: OrganizationInvitationProps) {
  return (
    <Html>
      <Head />
      <Preview>Join {organizationName} on Vyrel</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>You’re invited</Heading>
          <Text style={text}>
            {inviterName} invited you to join {organizationName} as {role}.
          </Text>
          <Section style={buttonContainer}>
            <Button href={invitationUrl} style={button}>
              Accept invitation
            </Button>
          </Section>
          <Text style={footer}>
            This invitation expires in 48 hours. If you were not expecting it,
            you can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f4f1",
  fontFamily:
    'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
};
const container = {
  backgroundColor: "#ffffff",
  borderRadius: "20px",
  margin: "48px auto",
  maxWidth: "560px",
  padding: "40px",
};
const heading = {
  color: "#242126",
  fontSize: "28px",
  margin: "0 0 24px",
};
const text = {
  color: "#5f5962",
  fontSize: "16px",
  lineHeight: "26px",
};
const buttonContainer = { padding: "20px 0" };
const button = {
  backgroundColor: "#7357c8",
  borderRadius: "12px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  padding: "14px 24px",
  textDecoration: "none",
};
const footer = {
  color: "#88818b",
  fontSize: "13px",
  lineHeight: "20px",
};
