/** Canned audit in the same shape the real agent is asked to return. Used for offline demos. */
export async function mockAudit(_url: string): Promise<unknown> {
  await new Promise((r) => setTimeout(r, 1500)); // feel like a real run
  return {
    steps: [
      { step: 1, description: 'Landing page offers a Rs 1 trial', charge: 'Rs 1' },
      { step: 2, description: 'Asks for name, email and phone', charge: '' },
      { step: 3, description: 'Plan page: after 7 days the plan renews every month', charge: 'Rs 999/month' }
    ],
    recurring_charge: 'Rs 999/month',
    asks_for_card_before_trial: true,
    auto_renews: true,
    cancellation: 'Cancel link only inside the Terms page',
    hidden_fees: []
  };
}
