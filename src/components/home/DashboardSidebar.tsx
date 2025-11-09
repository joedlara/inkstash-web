import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/home/DashboardSidebar.css';

export default function DashboardSidebar() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you');

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-content">
        <h1 className="greeting">Hi {user?.user_metadata?.username || 'there'}!</h1>

        <div className="sidebar-tabs">
          <button
            className={`sidebar-tab ${activeTab === 'for-you' ? 'active' : ''}`}
            onClick={() => setActiveTab('for-you')}
          >
            For You
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'following' ? 'active' : ''}`}
            onClick={() => setActiveTab('following')}
          >
            Following
          </button>
        </div>
      </div>
    </aside>
  );
}
