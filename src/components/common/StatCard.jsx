import React from 'react';
import Icon from './Icon';

export default function StatCard({ label, value, subtext, iconName, colorClass, route, onClick }) {
  const handleClick = () => {
    if (onClick) onClick();
  };

  return (
    <div
      className="card stat"
      style={route || onClick ? { cursor: 'pointer' } : {}}
      onClick={handleClick}
    >
      <div className={`ico ${colorClass}`}>
        <Icon name={iconName} size={22} />
      </div>
      <div>
        <div className="v">{value}</div>
        <div className="l">{label}</div>
        {subtext && <div className="s">{subtext}</div>}
      </div>
    </div>
  );
}
