import React from 'react';
import { Inbox, Sparkles } from 'lucide-react';

export default function EmptyState({ 
  icon: Icon = Inbox, 
  title = "No records found", 
  description = "New data will be automatically populated here once synced with the database.",
  actionText = null,
  onAction = null,
  tag = "Phase 1 Placeholder"
}) {
  return (
    <div className="empty-state-container">
      <div className="empty-state-icon-wrapper">
        <Icon size={26} strokeWidth={1.75} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      {tag && (
        <span className="empty-state-tag">
          <Sparkles size={12} />
          {tag}
        </span>
      )}
      {actionText && onAction && (
        <button 
          type="button" 
          onClick={onAction} 
          className="btn btn-secondary btn-sm"
          style={{ marginTop: '16px' }}
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
