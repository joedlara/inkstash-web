import '../../styles/Footer.css';

export default function MembersCarousel() {
  return (
    <footer className="footer">
      &copy; {new Date().getFullYear()} InkStash — Secure, SSL-encrypted
      marketplace.
    </footer>
  );
}
