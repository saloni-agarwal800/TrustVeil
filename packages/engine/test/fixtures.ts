import type { PageSnapshot } from '@trustveil/shared';

const base: PageSnapshot = {
  url: 'https://example.com/',
  hostname: 'example.com',
  title: 'Example',
  isHttps: true,
  text: 'A normal article about gardening.',
  hasPasswordField: false,
  hasPaymentField: false,
  checkboxes: [],
  buttons: [],
  timers: [],
  fineprint: []
};

export const safePage: PageSnapshot = { ...base };

export const scamTrialPage: PageSnapshot = {
  ...base,
  url: 'https://streammax-offer.example/trial',
  hostname: 'streammax-offer.example',
  text: 'Sirf aaj! Offer expires in 09:59. Start for Rs 1, then Rs 999/month auto-renews. Last chance, hurry!',
  checkboxes: [{ label: 'Yes, subscribe me to the monthly auto-renew membership', checked: true }],
  buttons: [
    { text: 'Start Trial', width: 320, height: 56, fontSize: 18, color: 'rgb(255, 255, 255)', bg: 'rgb(0, 160, 80)' },
    { text: 'no thanks', width: 60, height: 16, fontSize: 9, color: 'rgb(200, 200, 200)', bg: 'rgb(255, 255, 255)' }
  ],
  timers: ['09:59'],
  fineprint: ['You authorise recurring charges every month. Cancel only via support email.']
};

export const fakeBankPage: PageSnapshot = {
  ...base,
  url: 'http://sbi-secure-login.com/login',
  hostname: 'sbi-secure-login.com',
  isHttps: false,
  title: 'State Bank of India - Net Banking',
  text: 'State Bank of India Net Banking. Enter your username and password.',
  hasPasswordField: true
};
