import nodemailer from 'nodemailer';

function createTransporter() {
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
  const transporter = createTransporter();
  if (!transporter) return;

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
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
              <li>Create up to <strong>3 quizzes</strong> with 10 questions each</li>
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

const SUPER_ADMIN_EMAIL = 'contact.topstudent@gmail.com';

export async function sendNewUserNotification(name: string, email: string, role: string): Promise<void> {
  const transporter = createTransporter();
  if (!transporter) return;

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
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
