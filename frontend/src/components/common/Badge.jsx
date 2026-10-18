import React from 'react';

export const Badge = ({ children, variant = 'neutral' }) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'success':
      case 'active':
      case 'available':
      case 'fulfilled':
        return 'badge-success';
      case 'danger':
      case 'suspended':
      case 'lost':
      case 'cancelled':
        return 'badge-danger';
      case 'warning':
      case 'expired':
      case 'pending':
      case 'maintenance':
        return 'badge-warning';
      case 'info':
      case 'issued':
        return 'badge-info';
      default:
        return 'badge-neutral';
    }
  };

  return <span className={`badge ${getVariantClass()}`}>{children}</span>;
};

