import React from 'react';
import { BC } from '../../utils/helpers';

export default function Badge({ text }) {
  const colorClass = BC[text] || 'gray';
  return <span className={`bdg ${colorClass}`}>{text}</span>;
}
