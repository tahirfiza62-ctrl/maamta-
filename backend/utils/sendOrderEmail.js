
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const sendOrderEmail = async (order) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is missing from environment variables.");
    }

    if (!order) {
      throw new Error("Order data is missing.");
    }

    const orderNumber = order.orderNumber || "N/A";
    const customer = order.customer || {};
    const items = order.items || [];

    const itemsHtml = items
      .map((item) => {
        const price = Number(item.price || 0);
        const quantity = Number(item.quantity || 1);
        const itemTotal = price * quantity;

        return `
          <tr>
            <td style="padding:12px;border-bottom:1px solid #eee;">
              ${escapeHtml(item.name || "Product")}
              ${
                item.color
                  ? `<br>
                     <span style="font-size:12px;color:#777;">
                       Color: ${escapeHtml(item.color)}
                     </span>`
                  : ""
              }
            </td>

            <td style="padding:12px;border-bottom:1px solid #eee;text-align:center;">
              ${quantity}
            </td>

            <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">
              Rs. ${price.toLocaleString()}
            </td>

            <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">
              Rs. ${itemTotal.toLocaleString()}
            </td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>MAMTA New Order</title>
      </head>

      <body style="
        margin:0;
        padding:0;
        background:#fff9f4;
        font-family:Arial,Helvetica,sans-serif;
        color:#4a3032;
      ">

        <div style="
          max-width:700px;
          margin:30px auto;
          background:#ffffff;
          border-radius:14px;
          overflow:hidden;
        ">

          <div style="
            background:#d98f9a;
            padding:30px;
            text-align:center;
          ">
            <h1 style="margin:0;color:white;font-size:30px;">
              MAMTA
            </h1>

            <p style="margin:8px 0 0;color:white;">
              Comfort • Care • Love
            </p>
          </div>

          <div style="padding:30px;">

            <h2>🛍️ New Order Received</h2>

            <p>
              A new order has been placed on the MAMTA website.
            </p>

            <div style="
              background:#fff9f4;
              padding:18px;
              border-radius:10px;
              margin:20px 0;
            ">
              <p>
                <strong>Order Number:</strong>
                ${escapeHtml(orderNumber)}
              </p>

              <p>
                <strong>Status:</strong>
                ${escapeHtml(order.orderStatus || "Pending")}
              </p>

              <p>
                <strong>Payment:</strong>
                ${escapeHtml(order.paymentMethod || "Cash on Delivery")}
              </p>
            </div>

            <h3>Customer Information</h3>

            <div style="
              background:#fdf5f5;
              padding:18px;
              border-radius:10px;
            ">
              <p>
                <strong>Name:</strong>
                ${escapeHtml(customer.name || "N/A")}
              </p>

              <p>
                <strong>Email:</strong>
                ${escapeHtml(customer.email || "N/A")}
              </p>

              <p>
                <strong>Phone:</strong>
                ${escapeHtml(customer.phone || "N/A")}
              </p>

              <p>
                <strong>Address:</strong>
                ${escapeHtml(customer.address || "N/A")}
              </p>

              <p>
                <strong>City:</strong>
                ${escapeHtml(customer.city || "N/A")}
              </p>
            </div>

            <h3 style="margin-top:30px;">
              Ordered Products
            </h3>

            <table style="
              width:100%;
              border-collapse:collapse;
              font-size:14px;
            ">
              <thead>
                <tr style="background:#f4d9dc;">
                  <th style="padding:12px;text-align:left;">
                    Product
                  </th>

                  <th style="padding:12px;text-align:center;">
                    Qty
                  </th>

                  <th style="padding:12px;text-align:right;">
                    Price
                  </th>

                  <th style="padding:12px;text-align:right;">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="
              margin-top:25px;
              padding:20px;
              background:#fff9f4;
              border-radius:10px;
            ">
              <p>
                <strong>Subtotal:</strong>
                Rs. ${Number(order.subtotal || 0).toLocaleString()}
              </p>

              <h2 style="color:#bd6f7c;">
                Total:
                Rs. ${Number(order.total || 0).toLocaleString()}
              </h2>
            </div>

          </div>

          <div style="
            padding:20px;
            text-align:center;
            background:#f4d9dc;
            font-size:13px;
          ">
            MAMTA — Made with Love for Mothers & Little Ones
          </div>

        </div>

      </body>
      </html>
    `;

    console.log("");
    console.log("RESEND: Sending MAMTA order email...");
    console.log("Order:", orderNumber);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
     body: JSON.stringify({
  from: process.env.RESEND_FROM_EMAIL,
  replyTo: "maamtacircle@gmail.com",
  to: ["maamtacircle@gmail.com"],
  subject: `New MAMTA Order - ${orderNumber}`,
  html,
}),
      signal: AbortSignal.timeout(15000),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        `Resend order email failed: ${JSON.stringify(result)}`
      );
    }

    console.log("RESEND: Order email accepted successfully:", result.id);

    return result;

  } catch (error) {
    console.error("");
    console.error("SEND ORDER EMAIL ERROR");
    console.error("========================================");
    console.error(error);
    console.error("========================================");
    console.error("");

    throw error;
  }
};

module.exports = sendOrderEmail;
