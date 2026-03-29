exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { password } = JSON.parse(event.body);
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.error("ADMIN_PASSWORD environment variable is not set");
      return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error" }) };
    }

    if (!password || password !== adminPassword) {
      return { statusCode: 401, body: JSON.stringify({ error: "Incorrect password" }) };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request" }) };
  }
};
