import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTable } from './DataTable';

describe('DataTable', () => {
  it('renders rows and headers', () => {
    render(<DataTable rows={[{ id: '1', n: 'Jane' }]} rowKey={(r) => r.id} columns={[{ header: 'Name', cell: (r) => r.n }]} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
  });
  it('falls back to the empty state', () => {
    render(<DataTable rows={[]} rowKey={() => ''} columns={[]} empty="No candidates yet" />);
    expect(screen.getByText('No candidates yet')).toBeInTheDocument();
  });
});
