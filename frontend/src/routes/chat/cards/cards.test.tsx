import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChatCard } from '.';
import type { Message } from '../../../lib/types';

const msg = (status: 'pending' | 'confirmed'): Message => ({
  _id: 'm1', role: 'assistant', text: '', createdAt: '',
  card: { type: 'status_confirm', status, data: { candidateId: 'c1', name: 'Rahim', from: 'interviewed', to: 'hired' } },
});
const renderCard = (m: Message, onUpdate = vi.fn()) => (render(<MemoryRouter><ChatCard message={m} onUpdate={onUpdate} /></MemoryRouter>), onUpdate);

afterEach(() => vi.restoreAllMocks());

describe('chat cards', () => {
  it('sends confirm to the action endpoint and reports the updated message', async () => {
    const updated = msg('confirmed');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(updated)));
    const onUpdate = renderCard(msg('pending'));
    fireEvent.click(screen.getByText('Update status'));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(updated));
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/messages\/m1\/action$/);
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string).action).toBe('confirm');
  });

  it('shows the server error and keeps the card actionable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'Cannot move Rahim' }), { status: 409 }));
    renderCard(msg('pending'));
    fireEvent.click(screen.getByText('Update status'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot move Rahim');
    expect(screen.getByText('Update status')).toBeEnabled();
  });

  it('hides actions once handled', () => {
    renderCard(msg('confirmed'));
    expect(screen.queryByText('Update status')).not.toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });
});
