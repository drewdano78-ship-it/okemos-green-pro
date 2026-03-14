const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { amount, currency, description, customerEmail, customerName } = JSON.parse(event.body);

    if (!amount || amount < 50) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Amount must be at least $0.50" }),
      };
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency || "usd",
      description: description || "Okemos Green Pro Service",
      receipt_email: customerEmail || undefined,
      metadata: {
        customer_name: customerName || "",
      },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientSecret: paymentIntent.client_secret }),
    };
  } catch (err) {
    console.error("Stripe error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
