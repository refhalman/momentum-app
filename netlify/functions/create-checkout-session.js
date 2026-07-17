const Stripe = require("stripe");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY;
  const PRICE_YEARLY = process.env.STRIPE_PRICE_YEARLY;
  const site = process.env.URL || "http://localhost:8888";

  try {
    const { billing } = JSON.parse(event.body || "{}");
    const priceId = billing === "yearly" ? PRICE_YEARLY : PRICE_MONTHLY;

    if (!priceId) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Stripe price ID not configured" }),
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${site}/?checkout=success`,
      cancel_url: `${site}/?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
