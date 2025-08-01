import axios from "axios"

export const createStripeAccountLink = async (
  userId: string,
  email: string
) => {
  const res = await axios.post(
    "https://api.stripe.com/v1/account_links",
    new URLSearchParams({
      account: userId,
      refresh_url: "http://localhost:5173/onboarding/refresh",
      return_url: "http://localhost:5173/onboarding/return",
      type: "account_onboarding",
    }),
    {
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  )

  return res.data.url
}
