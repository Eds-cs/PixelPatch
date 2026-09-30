// src/constants/routes.js
export const ROUTES = {
  HOME: '/',
  AI: '/ai',
  MESSAGES: '/messages',
  SERVICES: '/services',
  PARTNER: '/partner',
  SHOP: '/shops',
  SHOP_DETAIL: (id = ':id') => `/shops/${id}`,
  SHOP_DETAIL_PATH: '/shops/:id',
  SHOP_MANAGEMENT: {
    CREATE_VOUCHER: '/shops/create-voucher',
    DETAILS: '/shops/details',
    DETAILS_EDITABLE: '/shops/details/edit',
    DISCOUNTS: '/shops/discounts',
    REVIEW: '/shops/review',
    SERVICE: '/shops/service',
  },

  CHAT: "/chat/:shopId",
  CHAT_LIST: '/chat',
  CHAT_ID: '/chat/:chatId',
  
  PROFILE: '/profile',
  LOGIN: '/login',
  SIGNUP: '/signup',
  ACCOUNT_SIGNUP: '/account-sign-up',

  BUSINESS_SIGNUP: {
    STEP1: '/business-sign-up/step-1',
    STEP2: '/business-sign-up/step-2',
    STEP3: '/business-sign-up/step-3',
    STEP4: '/business-sign-up/step-4',
  },
  EMAIL_VERIFY: '/verify-email',
  CLIENT_BOOKING: '/client-booking',
  CLIENT_REPAIR_REQUEST_MODAL: '/client-repair-request-modal',
  CLIENT_PAYMENT_DETAILS_MODAL: '/client-payment-details-modal',
  REGISTRATION_POPUP: '/registration',
  REVIEW_MODAL: '/review-modal',
  HELP: '/help',
  ABOUT: '/about',
  CAREERS: '/careers',
  TERMS: '/terms',
  PRIVACY: '/privacy',
  REPAIRS: '/repairs',
  CLIENT_REPAIR_DETAIL: '/repairs/:id',
  REPAIR_PENDING: '/repairs/:id/pending',
  REPAIRS_PENDING_LIST: '/repairs/pending',
  REPAIRS_ACCEPTED: '/repairs/accepted',
  REPAIRS_IN_PROGRESS: '/repairs/in-progress',
  REPAIRS_DONE: '/repairs/done',
  REPAIRS_REJECTED: '/repairs/rejected',
  REPAIRS_COMPLETED: '/repairs/completed',
  DEVICES: '/devices',
  SETTINGS: '/settings',
  
  BUSINESS: {
    DASHBOARD: '/business',
    PROFILE: '/business/profile',
    REPAIRS: '/business/repairs',
    REPAIR_DETAIL: '/business/repairs/:id',
    AWAITING_ASSESSMENT: '/business/repairs/awaiting-assessment',
    REPAIR_ASSESSMENT: '/business/repairs/:id/assessment',
    REPAIR_IN_PROGRESS: '/business/repairs/:id/in-progress',
    REPAIR_DONE: '/business/repairs/:id/done',
    REPAIR_COMPLETED: '/business/repairs/:id/completed',
    REPAIR_REJECTED: '/business/repairs/:id/rejected',
    REPAIR_PENDING: '/business/repairs/:id/pending',
    SERVICES: '/business/services',
    DISCOUNTS: '/business/discounts',
    REVIEWS: '/business/reviews',
    SETTINGS: '/business/settings',
    HELP: '/business/help',
    DISPUTES: '/business/disputes',
  },
  LOGOUT: '/logout',
};

// Navbar paths 
export const NAV_ITEMS = [
  { id: 'home', path: ROUTES.HOME, label: 'Home', exact: true },
  { id: 'services', path: ROUTES.SERVICES, label: 'Services' },
  { id: 'partner', path: ROUTES.PARTNER, label: 'Become a Partner' }
];

// Footer navbar
export const FOOTER_SECTIONS = {
  quickLinks: [
    { path: ROUTES.SERVICES, label: 'Find Service' },
    { path: ROUTES.SERVICES, label: 'Services' }
  ],
  company: [
    { path: ROUTES.ABOUT, label: 'About' },
    { path: ROUTES.CAREERS, label: 'Career' }
  ],
  support: [
    { path: ROUTES.HELP, label: 'Help Center' },
    { path: ROUTES.TERMS, label: 'Terms of Service' },
    { path: ROUTES.PRIVACY, label: 'Privacy Policy' }
  ],
  social: [
    { url: 'https://facebook.com', label: 'Facebook' },
    { url: 'https://instagram.com', label: 'Instagram' },
    { url: 'https://twitter.com', label: 'X (Twitter)' }
  ]
};