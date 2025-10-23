import mailer from '../config/mailerConfig';

const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

// ===================== Student Credentials Email =====================
export const sendStudentCredentialsEmail = async (
  email: string,
  username: string,
  password: string
) => {
  try {
    const safeUsername = escapeHtml(username);
    const safePassword = escapeHtml(password);

    await mailer.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Your student account has been created',
      html: `
        <h1>Welcome to HomeSchooling Exam System!</h1>
        <p>Your account has been created with the following credentials:</p>
        <ul>
          <li><strong>Username:</strong> ${safeUsername}</li>
          <li><strong>Temporary Password:</strong> ${safePassword}</li>
        </ul>
        <p>Please <a href='${process.env.FRONTEND_URL}/login'>log in</a> and change your password immediately.</p>
      `,
    });
  } catch (error) {
    console.error('Error sending student credentials email:', error);
  }
};

// ===================== Assigned-to-Org Email =====================
export const sendAssignedToOrgEmail = async (
  email: string,
  name: string,
  orgName: string
) => {
  try {
    const safeName = escapeHtml(name);
    const safeOrgName = escapeHtml(orgName);

    await mailer.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'You have been added to a new organization',
      html: `
        <p>Hi ${safeName},</p>
        <p>You have been assigned as a student in the organization <strong>${safeOrgName}</strong>.</p>
        <p>You can now access courses, exams, and other resources within this organization.</p>
        <p>If you have any questions, please contact your teacher or admin.</p>
        <br/>
        <p>Best regards,<br/>Your Platform Team</p>
      `,
    });

    console.log(`Assigned-to-org email sent to ${email} for org ${orgName}`);
  } catch (error) {
    console.error('Error sending assigned-to-org email:', error);
  }
};

// ===================== Invite Email =====================
export const sendInviteEmail = async (
  email: string,
  code: string,
  orgName: string,
  inviterName: string
) => {
  try {
    const safeOrgName = escapeHtml(orgName);
    const safeInviterName = escapeHtml(inviterName);
    const inviteLink = `${process.env.FRONTEND_URL}/accept-invite?code=${code}`;

    await mailer.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: `You're invited to join ${safeOrgName}`,
      html: `
        <p>Hi there,</p>
        <p>${safeInviterName} has invited you to join the organization <strong>${safeOrgName}</strong>.</p>
        <p>Click the link below to accept the invite:</p>
        <p><a href="${inviteLink}">Accept Invite</a></p>
        <p>If you don’t have an account yet, you’ll be prompted to register first.</p>
        <br/>
        <p>Best regards,<br/>Your Platform Team</p>
      `,
    });

    console.log(`Invite email sent to ${email} for organization ${orgName}`);
  } catch (error) {
    console.error('Error sending invite email:', error);
  }
};
