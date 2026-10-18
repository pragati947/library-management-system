import React from 'react';

export const StatCard = ({ title, value, subtext, icon: Icon, color = '#4f46e5', bgLight = '#eef2ff' }) => {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: bgLight, color: color }}>
        {Icon && <Icon size={24} />}
      </div>
      <div className="stat-data">
        <span className="stat-label">{title}</span>
        <span className="stat-value">{value}</span>
        {subtext && <span className="stat-subtext">{subtext}</span>}
      </div>
    </div>
  );
};

