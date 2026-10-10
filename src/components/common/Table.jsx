import React, { useState } from 'react';

export default function Table({ cols = [], rows = [], pageSize = 10, minWidth = 760, emptyText = 'No records found' }) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  // Reset page if bounds exceeded
  const page = Math.min(currentPage, totalPages);
  const startIndex = (page - 1) * pageSize;
  const pageRows = rows.slice(startIndex, startIndex + pageSize);

  const from = totalRows ? startIndex + 1 : 0;
  const to = Math.min(totalRows, page * pageSize);

  const renderPageButtons = () => {
    if (!totalRows) return null;
    const buttons = [];
    let prev = 0;

    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
        if (p - prev > 1) {
          buttons.push(
            <span key={`dots-${p}`} className="muted">
              {' '}
              …{' '}
            </span>
          );
        }
        buttons.push(
          <button
            key={p}
            className={`pg ${p === page ? 'on' : ''}`}
            onClick={() => setCurrentPage(p)}
          >
            {p}
          </button>
        );
        prev = p;
      }
    }
    return buttons;
  };

  return (
    <div>
      <div className="tw">
        <table className="tbl" style={{ minWidth: `${minWidth}px` }}>
          <thead>
            <tr>
              {cols.map((col, idx) => (
                <th key={idx} className={col.cls || ''}>
                  {col.h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length > 0 ? (
              pageRows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {cols.map((col, cIdx) => (
                    <td key={cIdx} className={col.cls || ''}>
                      {typeof col.f === 'function' ? col.f(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={cols.length} className="empty">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalRows > 0 && (
        <div className="pager">
          <span>
            Showing {from}–{to} of {totalRows}
          </span>
          <div>
            <button className="pg" disabled={page <= 1} onClick={() => setCurrentPage(page - 1)}>
              ‹
            </button>
            {renderPageButtons()}
            <button className="pg" disabled={page >= totalPages} onClick={() => setCurrentPage(page + 1)}>
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
