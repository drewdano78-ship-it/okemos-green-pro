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

  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const store = getStore("bookings");

    // Get the index of all booking IDs
    let bookingIndex = [];
    try {
      const index = await store.get("_index", { type: "json" });
      if (index) bookingIndex = index;
    } catch (e) {
      // No bookings yet
    }

    // Fetch all bookings
    const bookings = [];
    for (const bookingId of bookingIndex) {
      try {
        const booking = await store.get(bookingId, { type: "json" });
        if (booking) bookings.push(booking);
      } catch (e) {
        // Skip missing bookings
      }
    }

    // Optionally filter by status
    const params = event.queryStringParameters || {};
    let filtered = bookings;

    if (params.status) {
      const statusFilter = params.status.toLowerCase();
      filtered = bookings.filter((b) => b.status.toLowerCase() === statusFilter);
    }

    if (params.date) {
      filtered = filtered.filter((b) => b.date && b.date.startsWith(params.date));
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ bookings: filtered, total: filtered.length }),
    };
  } catch (err) {
    console.error("Get bookings error:", err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to retrieve bookings" }),
    };
  }
};
