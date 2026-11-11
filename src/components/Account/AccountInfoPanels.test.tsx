import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { AccountInfoPanels } from './AccountInfoPanels';
vi.mock('./AccountInfoCard', () => ({ AccountInfoCard: () => <div>Personal controls</div> }));
vi.mock('./SecurityCard', () => ({ SecurityCard: ({section}: {section:string}) => <div>{section} controls</div> }));
afterEach(cleanup);
describe('Account panels', () => {
  it.each([['Your personal details', 'Personal controls'], ['Security & Password', 'security controls'], ['Close Account', 'close controls']])('opens only the selected %s controls', (name, text) => {
    render(<AccountInfoPanels loginEmail="owner@example.com" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: new RegExp(name.replace('&', '\&'))}));
    expect(screen.getByRole('dialog')).toHaveTextContent(text);
    for (const other of ['Personal controls', 'security controls', 'close controls'].filter(v=>v!==text)) expect(screen.queryByText(other)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'Close'}));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
