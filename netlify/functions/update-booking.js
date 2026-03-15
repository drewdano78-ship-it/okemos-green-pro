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

  if (event.httpMethod !== "PUT" && event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { bookingId, status, crewNotes, completedAt, checklistItems, reportSent } = JSON.parse(event.body);

    if (!bookingId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "bookingId is required" }),
      };
    }

    const store = getStore("bookings");
    const booking = await store.get(bookingId, { type: "json" });

    if (!booking) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Booking not found" }),
      };
    }

    // Update fields
    if (status) booking.status = status;
    if (crewNotes) booking.crewNotes = crewNotes;
    if (completedAt) booking.completedAt = completedAt;
    if (checklistItems) booking.checklistItems = checklistItems;
    if (reportSent !== undefined) booking.reportSent = reportSent;
    booking.updatedAt = new Date().toISOString();

    await store.setJSON(bookingId, booking);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Booking updated", booking }),
    };
  } catch (err) {
    console.error("Update booking error:", err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to update booking" }),
    };
  }
};
