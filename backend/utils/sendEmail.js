
const escapeHtml = (value = "") => {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });
};

// =========================================================
// SEND VERIFICATION EMAIL USING RESEND API
// =========================================================

const sendVerificationEmail = async (email, name, code) => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is missing.");
  }

  const safeName = escapeHtml(name);
  const safeCode = escapeHtml(code);

  const mailOptions = {
     from: process.env.RESEND_FROM_EMAIL,
  replyTo: "maamtacircle@gmail.com",
  to: [email],
  subject: "Your MAMTA verification code",
  html: `...`,
  text: `Hi ${name}, your MAMTA verification code is ${code}. It expires in 24 hours.`,

    subject: "Your MAMTA verification code",

    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Your MAMTA verification code</title>
        </head>

        <body style="
          margin: 0;
          padding: 0;
          background: #fff9f4;
          font-family: Arial, Helvetica, sans-serif;
          color: #4a3032;
        ">

          <div style="
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 22px;
            overflow: hidden;
            box-shadow: 0 15px 50px rgba(74,48,50,0.08);
          ">

            <div style="
              padding: 38px 25px;
              text-align: center;
              background: #4a3032;
            ">
              <div style="
                color: #ffffff;
                font-size: 28px;
                font-weight: 700;
                letter-spacing: 5px;
              ">
                MAMTA
              </div>

              <div style="
                margin-top: 10px;
                color: #f4ddd6;
                font-size: 11px;
                letter-spacing: 2px;
              ">
                THOUGHTFUL COMFORT
              </div>
            </div>

            <div style="
              padding: 45px 40px;
              text-align: center;
            ">

              <div style="
                width: 70px;
                height: 70px;
                margin: 0 auto 25px;
                border-radius: 50%;
                background: #f8ebe5;
                font-size: 30px;
                line-height: 70px;
              ">
                ♡
              </div>

              <h1 style="
                margin: 0 0 15px;
                color: #4a3032;
                font-size: 28px;
                font-weight: 600;
              ">
                Verify your email
              </h1>

              <p style="
                margin: 0 0 15px;
                color: #806a6e;
                font-size: 15px;
              ">
                Hi ${safeName},
              </p>

              <p style="
                margin: 0 auto 25px;
                max-width: 440px;
                color: #806a6e;
                font-size: 14px;
                line-height: 1.8;
              ">
                Thank you for creating your MAMTA account.
                Enter the verification code below to
                complete your registration.
              </p>

              <div style="
                display: inline-block;
                padding: 18px 35px;
                margin: 5px 0 25px;
                background: #f8ebe5;
                border-radius: 12px;
                color: #4a3032;
                font-size: 32px;
                font-weight: 700;
                letter-spacing: 8px;
              ">
                ${safeCode}
              </div>

              <p style="
                margin: 0;
                color: #9a8588;
                font-size: 12px;
                line-height: 1.7;
              ">
                This verification code expires in
                <strong>24 hours.</strong>
              </p>

              <p style="
                margin: 15px 0 0;
                color: #9a8588;
                font-size: 12px;
                line-height: 1.7;
              ">
                If you did not create a MAMTA account,
                you can safely ignore this email.
              </p>

            </div>

            <div style="
              padding: 22px;
              text-align: center;
              background: #fcf5f1;
              color: #9a8588;
              font-size: 11px;
            ">
              © ${new Date().getFullYear()}
              MAMTA. All rights reserved.
            </div>

          </div>
        </body>
      </html>
    `,

    text: `Hi ${name}, your MAMTA verification code is ${code}. It expires in 24 hours.`,
  };

  console.log("RESEND: Sending verification email...");

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify(mailOptions),

      signal: AbortSignal.timeout(15000),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error("RESEND API ERROR:", result);

    throw new Error(
      result.message || result.name || "Email delivery failed."
    );
  }

  console.log("RESEND: Email accepted successfully:", result.id);

  return result;
};

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  sendVerificationEmail,
};
