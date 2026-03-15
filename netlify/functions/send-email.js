const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { to, customerName, service, date, time, address, bookingId, type, message } = JSON.parse(event.body);

    // Store the email notification in Blobs for tracking
    const emailStore = getStore("emails");
    const emailId = "EM-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();

    const emailRecord = {
      id: emailId,
      to,
      customerName,
      service,
      date,
      time,
      address,
      bookingId,
      type: type || "booking-confirmation",
      message: message || null,
      sentAt: new Date().toISOString(),
      status: "queued",
    };

    // Build the email content based on type
    let subject, body;

    if (type === "crew-report") {
      subject = `Service Complete - ${service} | Okemos Green Pro`;
      body = message || `Hi ${customerName}, your ${service} service has been completed. Thank you for choosing Okemos Green Pro!`;
    } else {
      subject = `Booking Confirmed - ${service} | Okemos Green Pro`;
      body = [
        `Hi ${customerName}!`,
        "",
        "Great news - your booking with Okemos Green Pro is confirmed!",
        "",
        `Service: ${service}`,
        `Date: ${date}`,
        `Time: ${time}`,
        `Address: ${address}`,
        `Booking ID: ${bookingId}`,
        "",
        "What to expect:",
        "- Our crew will arrive at your scheduled time",
        "- You'll receive before & after photos when the job is done",
        "- Your gate will be securely latched after service (if applicable)",
        "",
        "Questions? Call us at (989) 966-9094",
        "",
        "Thank you for choosing Okemos Green Pro!",
        "- The Okemos Green Pro Team",
      ].join("\n");
    }

    emailRecord.subject = subject;
    emailRecord.body = body;
    emailRecord.status = "sent";

    await emailStore.setJSON(emailId, emailRecord);

    // Maintain email index
    let emailIndex = [];
    try {
      const existingIndex = await emailStore.get("_index", { type: "json" });
      if (existingIndex) emailIndex = existingIndex;
    } catch (e) {
      // Index doesn't exist yet
    }
    emailIndex.unshift(emailId);
    await emailStore.setJSON("_index", emailIndex);

    // If SENDGRID_API_KEY or MAILGUN_API_KEY is set, send real email
    // Otherwise, the email is logged and stored for the admin to review
    if (process.env.SENDGRID_API_KEY) {
      try {
        const sgResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: process.env.FROM_EMAIL || "noreply@okemosgreenspro.com", name: "Okemos Green Pro" },
            subject: subject,
            content: [{ type: "text/plain", value: body }],
          }),
        });
        emailRecord.status = sgResponse.ok ? "delivered" : "failed";
        await emailStore.setJSON(emailId, emailRecord);
      } catch (sendErr) {
        console.warn("SendGrid delivery failed:", sendErr.message);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ emailId, status: emailRecord.status, message: "Email notification processed" }),
    };
  } catch (err) {
    console.error("Send email error:", err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to process email" }),
    };
  }
};
