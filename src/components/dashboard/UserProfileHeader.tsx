import React from 'react';
import '../../styles/dashboard/userProfileHeader.css';
import { Star } from 'lucide-react';
import type { Badge, UserProfileData } from '../../types/dashboard';

interface UserProfileHeaderProps {
  user: UserProfileData;
  isLoading?: boolean;
}

const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({
  user,
  isLoading = false,
}) => {
  const progressPercentage = Math.min((user.xp / user.xpToNext) * 100, 100);

  return (
    <div
      className={`user-profile-header ${isLoading ? 'profile-loading' : ''}`}
    >
      <div className="profile-content">
        {/* Avatar */}
        <div className="profile-avatar">
          <img
            src={
              user.avatarUrl ||
              'https://www.pikpng.com/pngl/b/80-805068_my-profile-icon-blank-profile-picture-circle-clipart.png'
            }
            alt={user.name}
            className="avatar-image"
          />
          {user.isOnline && <div className="online-indicator" />}
        </div>

        {/* User Info */}
        <div className="profile-info">
          <div className="user-name-section">
            <h2 className="user-name">{user.name}</h2>
            <span className="user-username">@{user.username}</span>
          </div>

          {/* Level and XP */}
          <div className="level-section">
            <div className="level-badge">
              <Star className="level-icon" />
              <span>Level {user.level}</span>
            </div>
            <span className="xp-info">
              ({user.xp.toLocaleString()}/{user.xpToNext.toLocaleString()} XP)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="progress-section">
            <div className="progress-header">
              <span className="progress-label">
                Progress to Level {user.level + 1}
              </span>
              <span className="progress-stats">
                {user.xp.toLocaleString()} / {user.xpToNext.toLocaleString()} XP
              </span>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Badges */}
          <div className="badges-section">
            <h4 className="badges-title">Recent Badges</h4>
            <div className="badges-container">
              {user.badges.slice(0, 4).map((badge: Badge) => {
                const IconComponent = badge.icon;
                return (
                  <span
                    key={badge.id}
                    className={`badge badge-${badge.color} ${badge.isNew ? 'badge-new' : ''}`}
                    title={badge.name}
                  >
                    <IconComponent
                      className="badge-icon"
                      size={16}
                      aria-hidden="true"
                    />
                    <span className="badge-text">{badge.name}</span>
                  </span>
                );
              })}
              {user.badges.length > 4 && (
                <span className="badge badge-more">
                  +{user.badges.length - 4} more
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileHeader;
