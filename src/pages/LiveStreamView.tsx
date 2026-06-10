import { useParams } from 'react-router-dom';

export default function LiveStreamView() {
  const { id } = useParams();
  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: '#08070A',
      color: '#FAF7F2',
      fontFamily: 'Geist, system-ui, sans-serif',
      padding: 24,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Live stream coming soon</h1>
        <p style={{ marginTop: 12, opacity: 0.7 }}>
          Room <code>{id}</code> is being rebuilt. Check back shortly.
        </p>
      </div>
    </div>
  );
}
