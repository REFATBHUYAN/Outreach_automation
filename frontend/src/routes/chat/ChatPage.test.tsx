import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Component as ChatPage } from './ChatPage';

const greeting = { _id: 'g', role: 'assistant', text: 'Hi! Paste a job description', createdAt: '' };
let chatReply: (r: Response) => void;

beforeEach(() => {
  vi.stubGlobal('EventSource', class { onmessage = null; close() {} });
  Element.prototype.scrollIntoView = () => {};
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (u) => {
    const url = String(u);
    if (url.endsWith('/chat')) return new Promise<Response>((r) => (chatReply = r));
    if (url.endsWith('/messages/clear')) return new Response(JSON.stringify([{ ...greeting, _id: 'g2' }]));
    return new Response(JSON.stringify([greeting, { _id: 'u1', role: 'user', text: 'old message', createdAt: '' }]));
  });
});

describe('ChatPage', () => {
  it('empties the message box as soon as it is sent, and restores it if sending fails', async () => {
    render(<MemoryRouter><ChatPage /></MemoryRouter>);
    const box = screen.getByLabelText('Message') as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: 'Senior React Engineer JD…' } });
    fireEvent.click(screen.getByLabelText('Send'));
    expect(box.value).toBe(''); // cleared before the AI answers
    chatReply(new Response(JSON.stringify({ error: 'AI unavailable' }), { status: 503 }));
    await waitFor(() => expect(box.value).toBe('Senior React Engineer JD…'));
    expect(screen.getByRole('alert')).toHaveTextContent('AI unavailable');
  });

  it('"New chat" replaces the conversation with a fresh greeting', async () => {
    render(<MemoryRouter><ChatPage /></MemoryRouter>);
    expect(await screen.findByText('old message')).toBeInTheDocument();
    fireEvent.click(screen.getByText('New chat'));
    await waitFor(() => expect(screen.queryByText('old message')).not.toBeInTheDocument());
    expect(screen.getByText(greeting.text)).toBeInTheDocument();
  });
});
