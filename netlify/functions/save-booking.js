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
    const booking = JSON.parse(event.body);

    if (!booking.name || !booking.email || !booking.service || !booking.date || !booking.time) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing required fields: name, email, service, date, time" }),
      };
    }

    const bookingId = "BK-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();

    const bookingRecord = {
      ...booking,
      id: bookingId,
      status: booking.status || "Confirmed",
      createdAt: booking.createdAt || new Date().toISOString(),
    };

    const store = getStore("bookings");
    await store.setJSON(bookingId, bookingRecord);

    // Also maintain a list of all booking IDs for easy retrieval
    let bookingIndex = [];
    try {
      const existingIndex = await store.get("_index", { type: "json" });
      if (existingIndex) bookingIndex = existingIndex;
    } catch (e) {
      // Index doesn't exist yet
    }
    bookingIndex.unshift(bookingId);
    await store.setJSON("_index", bookingIndex);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ bookingId, message: "Booking saved successfully" }),
    };
  } catch (err) {
    console.error("Save booking error:", err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to save booking" }),
    };
  }
};
