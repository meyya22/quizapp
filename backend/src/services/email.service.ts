import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient() as any;

async function getFromAddress(): Promise<string> {
  try {
    const config = await prisma.emailConfig.findUnique({ where: { id: 1 } });
    if (config?.fromEmail) {
      return config.fromName ? `"${config.fromName}" <${config.fromEmail}>` : config.fromEmail;
    }
  } catch { /* fall through */ }
  return process.env.SMTP_FROM || process.env.SMTP_USER || '';
}

async function createTransporter() {
  // Prefer DB config if available
  try {
    const config = await prisma.emailConfig.findUnique({ where: { id: 1 } });
    if (config?.host && config?.user && config?.pass) {
      return nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: { user: config.user, pass: config.pass },
      });
    }
  } catch { /* fall through to env vars */ }

  // Fall back to env vars
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: SMTP_PORT === '465',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendWelcomeEmail(to: string, name: string, role: string): Promise<void> {
  const transporter = await createTransporter();
  if (!transporter) return;

  const from = await getFromAddress();
  const appUrl = process.env.FRONTEND_URL || 'https://quizapp-frontend-552535177061.us-central1.run.app';
  const isAdmin = role === 'ADMIN';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px 40px;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 12px;">
              <tr>
                <td style="background:rgba(255,255,255,0.2);border-radius:10px;padding:10px 14px;">
                  <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:1px;">&#128218; Xam Bridge</span>
                </td>
              </tr>
            </table>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Welcome aboard, ${name}!</h1>
            <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px;">Your account has been created successfully.</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6;">
              Hi <strong>${name}</strong>, welcome to <strong>Xam Bridge</strong>! We're excited to have you on board.
              Here are your account details:
            </p>

            <!-- Account info box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;color:#64748b;font-size:13px;width:130px;">Full Name</td>
                      <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600;">${name}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#64748b;font-size:13px;">Email</td>
                      <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600;">${to}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#64748b;font-size:13px;">Account Type</td>
                      <td style="padding:6px 0;">
                        <span style="background:${isAdmin ? '#dbeafe' : '#d1fae5'};color:${isAdmin ? '#1d4ed8' : '#065f46'};font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;">
                          ${isAdmin ? 'Quiz Admin' : 'Participant'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#64748b;font-size:13px;">Plan</td>
                      <td style="padding:6px 0;">
                        <span style="background:#f1f5f9;color:#475569;font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;">
                          ${isAdmin ? 'Free Plan' : 'Learner (Free)'}
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            ${isAdmin ? `
            <p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.6;">
              As a <strong>Quiz Admin</strong> on the Free plan you can:
            </p>
            <ul style="margin:0 0 24px;padding-left:20px;color:#475569;font-size:14px;line-height:2;">
              <li>Create up to <strong>5 quizzes</strong> with 10 questions each</li>
              <li>Generate questions with <strong>AI</strong> (3 times/month)</li>
              <li>Manage up to <strong>10 contacts</strong> &amp; send 50 emails/month</li>
              <li>Collect up to <strong>50 quiz responses</strong> (lifetime)</li>
            </ul>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:#2563eb;border-radius:10px;padding:12px 28px;">
                  <a href="${appUrl}/admin" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Go to Dashboard &rarr;</a>
                </td>
              </tr>
            </table>
            ` : `
            <p style="margin:0 0 24px;color:#334155;font-size:14px;line-height:1.6;">
              You can now take any quiz shared with you — completely free, forever.
              Simply use the link your quiz creator shared with you to get started.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:#2563eb;border-radius:10px;padding:12px 28px;">
                  <a href="${appUrl}/participant" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Go to My Quizzes &rarr;</a>
                </td>
              </tr>
            </table>
            `}

            <p style="margin:0;color:#94a3b8;font-size:12px;">
              If you did not create this account, please ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              &copy; ${new Date().getFullYear()} Xam Bridge &nbsp;&middot;&nbsp; Empowering learners everywhere, free of charge.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `Welcome to Xam Bridge, ${name}!`,
      html,
    });
  } catch {
    // Non-fatal — don't block registration if email fails
  }
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<void> {
  const transporter = await createTransporter();
  if (!transporter) return;

  const from = await getFromAddress();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px 40px;text-align:center;">
            <span style="color:#ffffff;font-size:20px;font-weight:bold;">&#128218; Xam Bridge</span>
            <h1 style="margin:12px 0 4px;color:#ffffff;font-size:20px;font-weight:700;">Reset your password</h1>
            <p style="margin:0;color:#bfdbfe;font-size:13px;">This link expires in 1 hour.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6;">
              Hi <strong>${name}</strong>,<br><br>
              We received a request to reset the password for your Xam Bridge account.
              Click the button below to choose a new password.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="background:#2563eb;border-radius:10px;padding:13px 32px;">
                  <a href="${resetUrl}" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Reset Password &rarr;</a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 12px;color:#64748b;font-size:13px;line-height:1.6;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="margin:0 0 24px;word-break:break-all;">
              <a href="${resetUrl}" style="color:#2563eb;font-size:12px;">${resetUrl}</a>
            </p>
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              If you didn't request this, you can safely ignore this email — your password won't change.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              &copy; ${new Date().getFullYear()} Xam Bridge &nbsp;&middot;&nbsp; Empowering learners everywhere.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({ from, to, subject: 'Reset your Xam Bridge password', html });
  } catch { /* Non-fatal */ }
}

const SUPER_ADMIN_EMAIL = 'cs.admin@xambridge.com';

export async function sendSubscriptionConfirmationEmail(
  to: string,
  name: string,
  plan: string,
  periodEnd: Date,
): Promise<void> {
  const transporter = await createTransporter();
  if (!transporter) return;

  const from = await getFromAddress();
  const appUrl = process.env.FRONTEND_URL || 'https://www.xambridge.com';
  const isMonthly = plan !== 'YEARLY';
  const planLabel = isMonthly ? 'Monthly - $5/month' : 'Yearly - $50/year';
  const renewalDate = periodEnd.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px 40px;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 12px;">
              <tr>
                <td style="background:rgba(255,255,255,0.2);border-radius:10px;padding:10px 14px;">
                  <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:1px;">&#128081; Xam Bridge Pro</span>
                </td>
              </tr>
            </table>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">You're now on Pro, ${name}!</h1>
            <p style="margin:6px 0 0;color:#fef3c7;font-size:14px;">Your subscription is active. Thank you for upgrading.</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6;">
              Hi <strong>${name}</strong>, your Xam Bridge Pro subscription is now active. Here's a summary:
            </p>

            <!-- Subscription info box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;color:#92400e;font-size:13px;width:150px;">Plan</td>
                      <td style="padding:6px 0;color:#78350f;font-size:13px;font-weight:700;">${planLabel}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#92400e;font-size:13px;">Status</td>
                      <td style="padding:6px 0;">
                        <span style="background:#d1fae5;color:#065f46;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;">Active</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#92400e;font-size:13px;">Next renewal</td>
                      <td style="padding:6px 0;color:#78350f;font-size:13px;font-weight:600;">${renewalDate}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 12px;color:#334155;font-size:14px;font-weight:600;">What you now have access to:</p>
            <ul style="margin:0 0 24px;padding-left:20px;color:#475569;font-size:14px;line-height:2.2;">
              <li>50 quizzes &amp; 100 questions per quiz</li>
              <li>25 AI question generations / month</li>
              <li>2,000 quiz responses / month</li>
              <li>500 contacts &amp; 500 broadcast emails / month</li>
              <li>Quiz translation in 9 languages</li>
              <li>Advanced analytics &amp; Excel / PDF export</li>
            </ul>

            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:#2563eb;border-radius:10px;padding:12px 28px;">
                  <a href="${appUrl}/admin" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Go to Dashboard &rarr;</a>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#94a3b8;font-size:12px;">
              You can manage or cancel your subscription anytime from your account settings.
              Need help? Reply to this email or visit our <a href="${appUrl}/help" style="color:#2563eb;">Help &amp; Support</a> page.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              &copy; ${new Date().getFullYear()} Xam Bridge &nbsp;&middot;&nbsp; You're receiving this because you subscribed.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from,
      to,
      subject: 'Your Xam Bridge Pro subscription is active!',
      html,
    });
  } catch {
    // Non-fatal
  }
}

export async function sendNewUserNotification(name: string, email: string, role: string): Promise<void> {
  const transporter = await createTransporter();
  if (!transporter) return;

  const from = await getFromAddress();
  const isAdmin = role === 'ADMIN';
  const now = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:28px 36px;text-align:center;">
            <span style="color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:1px;">&#128218; Xam Bridge — Admin Alert</span>
            <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">New user registration</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px;">
            <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6;">
              A new user has just registered on <strong>Xam Bridge</strong>.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:7px 0;color:#64748b;font-size:13px;width:130px;">Full Name</td>
                      <td style="padding:7px 0;color:#0f172a;font-size:13px;font-weight:600;">${name}</td>
                    </tr>
                    <tr>
                      <td style="padding:7px 0;color:#64748b;font-size:13px;">Email</td>
                      <td style="padding:7px 0;color:#0f172a;font-size:13px;font-weight:600;">${email}</td>
                    </tr>
                    <tr>
                      <td style="padding:7px 0;color:#64748b;font-size:13px;">Account Type</td>
                      <td style="padding:7px 0;">
                        <span style="background:${isAdmin ? '#dbeafe' : '#d1fae5'};color:${isAdmin ? '#1d4ed8' : '#065f46'};font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;">
                          ${isAdmin ? 'Quiz Admin' : 'Participant'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:7px 0;color:#64748b;font-size:13px;">Registered At</td>
                      <td style="padding:7px 0;color:#0f172a;font-size:13px;">${now}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#94a3b8;font-size:12px;">
              This is an automated notification from the Xam Bridge platform.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 36px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              &copy; ${new Date().getFullYear()} Xam Bridge &nbsp;&middot;&nbsp; Super Admin Notification
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from,
      to: SUPER_ADMIN_EMAIL,
      subject: `New User Registered: ${name} (${isAdmin ? 'Quiz Admin' : 'Participant'})`,
      html,
    });
  } catch {
    // Non-fatal
  }
}
