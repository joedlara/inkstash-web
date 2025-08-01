export default function CreatorDashboard() {
  const onboardUser = async () => {
    const res = await fetch("/api/onboard", {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: { "Content-Type": "application/json" },
    })
    const data = await res.json()
    window.location.href = data.url
  }

  return <div>CreatorDashboard</div>
}
