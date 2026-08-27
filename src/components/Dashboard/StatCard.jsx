import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import './StatCard.css';

export default function StatCard({
  title,
  count = 0,
  icon: Icon,
  variant = 'new', // 'new' | 'pending' | 'confirmed' | 'cancelled' | 'event'
  badgeText = 'Active',
  subtitle = 'Awaiting incoming records',
  onClick
}) {
  return (
    <div className={`stat-card stat-card-${variant}`} onClick={onClick}>
      <div className="stat-card-top">
        <div className={`stat-icon-box stat-icon-${variant}`}>
          <Icon size={22} strokeWidth={2} />
        </div>
        <span className={`badge badge-${variant}`}>
          {badgeText}
        </span>
      </div>

      <div className="stat-card-body">
        <div className="stat-card-count">{count}</div>
        <div className="stat-card-title">{title}</div>
        <div className="stat-card-subtitle">{subtitle}</div>
      </div>

      <div className="stat-card-footer">
        <span className="stat-status-pill">View Details</span>
        <div className="stat-arrow">
          <ArrowUpRight size={14} />
        </div>
      </div>
    </div>
  );
}
