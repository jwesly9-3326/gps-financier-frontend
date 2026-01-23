// 📊 GOOGLE ANALYTICS SERVICE
// Measurement ID: G-K4VBLF28P9
// Tracking des événements utilisateur pour PL4TO

const GA_MEASUREMENT_ID = 'G-K4VBLF28P9';

// Initialiser Google Analytics
export const initGA = () => {
  // Charger le script gtag.js
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialiser dataLayer et gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false // On gère manuellement les page views pour SPA
  });

  console.log('[Analytics] Google Analytics initialisé');
};

// Tracker une page vue (pour SPA)
export const trackPageView = (pagePath, pageTitle) => {
  if (window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle
    });
    console.log(`[Analytics] Page vue: ${pagePath}`);
  }
};

// Tracker un événement custom
export const trackEvent = (eventName, params = {}) => {
  if (window.gtag) {
    window.gtag('event', eventName, params);
    console.log(`[Analytics] Event: ${eventName}`, params);
  }
};

// ===== ÉVÉNEMENTS SPÉCIFIQUES PL4TO =====

// Authentification
export const trackSignUp = (method = 'email') => {
  trackEvent('sign_up', { method });
};

export const trackLogin = (method = 'email') => {
  trackEvent('login', { method });
};

export const trackLogout = () => {
  trackEvent('logout');
};

// Onboarding
export const trackOnboardingStart = () => {
  trackEvent('onboarding_start');
};

export const trackOnboardingStep = (stepNumber, stepName) => {
  trackEvent('onboarding_step', {
    step_number: stepNumber,
    step_name: stepName
  });
};

export const trackOnboardingComplete = () => {
  trackEvent('onboarding_complete');
};

// Guide/Tooltips
export const trackGuideStart = (pageName) => {
  trackEvent('guide_start', { page: pageName });
};

export const trackGuideComplete = (pageName) => {
  trackEvent('guide_complete', { page: pageName });
};

// Comptes
export const trackAccountCreated = (accountType) => {
  trackEvent('account_created', { account_type: accountType });
};

export const trackAccountDeleted = () => {
  trackEvent('account_deleted');
};

// Budget
export const trackBudgetCreated = (budgetType) => {
  trackEvent('budget_created', { budget_type: budgetType });
};

export const trackBudgetEdited = () => {
  trackEvent('budget_edited');
};

// Objectifs
export const trackGoalCreated = (goalType) => {
  trackEvent('goal_created', { goal_type: goalType });
};

export const trackGoalCompleted = (goalType) => {
  trackEvent('goal_completed', { goal_type: goalType });
};

export const trackGoalDeleted = () => {
  trackEvent('goal_deleted');
};

// GPS Financier
export const trackGPSViewed = (viewMode) => {
  trackEvent('gps_viewed', { view_mode: viewMode });
};

export const trackGPSNavigated = (direction) => {
  trackEvent('gps_navigated', { direction });
};

// Simulations
export const trackSimulationCreated = (simulationType) => {
  trackEvent('simulation_created', { simulation_type: simulationType });
};

export const trackSimulationDeleted = () => {
  trackEvent('simulation_deleted');
};

// Abonnement
export const trackTrialStarted = () => {
  trackEvent('trial_started');
};

export const trackSubscriptionViewed = () => {
  trackEvent('subscription_viewed');
};

export const trackSubscriptionStarted = (planName, price) => {
  trackEvent('subscription_started', {
    plan_name: planName,
    value: price,
    currency: 'CAD'
  });
};

export const trackSubscriptionCancelled = (planName) => {
  trackEvent('subscription_cancelled', { plan_name: planName });
};

// Paramètres
export const trackThemeChanged = (theme) => {
  trackEvent('theme_changed', { theme });
};

export const trackLanguageChanged = (language) => {
  trackEvent('language_changed', { language });
};

// Engagement
export const trackFeatureUsed = (featureName) => {
  trackEvent('feature_used', { feature_name: featureName });
};

export const trackFullscreenToggled = (page, enabled) => {
  trackEvent('fullscreen_toggled', { page, enabled });
};

export const trackExportData = (format) => {
  trackEvent('export_data', { format });
};

// Erreurs (pour debugging)
export const trackError = (errorType, errorMessage) => {
  trackEvent('app_error', {
    error_type: errorType,
    error_message: errorMessage
  });
};

export default {
  initGA,
  trackPageView,
  trackEvent,
  trackSignUp,
  trackLogin,
  trackLogout,
  trackOnboardingStart,
  trackOnboardingStep,
  trackOnboardingComplete,
  trackGuideStart,
  trackGuideComplete,
  trackAccountCreated,
  trackAccountDeleted,
  trackBudgetCreated,
  trackBudgetEdited,
  trackGoalCreated,
  trackGoalCompleted,
  trackGoalDeleted,
  trackGPSViewed,
  trackGPSNavigated,
  trackSimulationCreated,
  trackSimulationDeleted,
  trackTrialStarted,
  trackSubscriptionViewed,
  trackSubscriptionStarted,
  trackSubscriptionCancelled,
  trackThemeChanged,
  trackLanguageChanged,
  trackFeatureUsed,
  trackFullscreenToggled,
  trackExportData,
  trackError
};
