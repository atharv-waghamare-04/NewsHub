const MAIL_API_URL = process.env.MAIL_API_URL;
const MAIL_SECRET = process.env.MAIL_SECRET;

async function sendEmail({ to, subject, text, html }) {
  if (!MAIL_API_URL || !MAIL_SECRET) {
    throw new Error("Google Mail API configuration is missing.");
  }

  if (typeof to !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw new Error("Invalid recipient email address.");
  }

  const response = await fetch(MAIL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: MAIL_SECRET,
      to,
      subject,
      text,
      html,
    }),
    signal: AbortSignal.timeout(30000),
    redirect: "follow",
  });

  const responseText = await response.text();

  let result;

  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(
      `Google Mail API returned an invalid response (HTTP ${response.status}).`,
    );
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.message || `Email delivery failed (HTTP ${response.status}).`,
    );
  }

  return result;
}

module.exports = sendEmail;
