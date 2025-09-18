// @ts-nocheck
// Placeholder E2E smoke test (skipped) to outline the desired flow without adding deps.
// If Playwright is available, replace with real test using '@playwright/test'.

describe.skip('EOV6 smoke', () => {
  it('agent-caller flow with ack', async () => {
    // Steps (documentation):
    // 1) Open /agent and create session code
    // 2) Open /s/[code] as caller in second context
    // 3) Exchange two messages
    // 4) Send details
    // 5) Open ack dropdown → send first ack
    // 6) Accept on caller → assert system ack message
    // 7) End session → inputs disabled
  });
});

