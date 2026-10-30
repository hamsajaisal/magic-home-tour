// =====================================================================
//  GAME SETTINGS  –  you can safely change the numbers / words below.
//  After saving this file, reload the game page in the browser.
//  Only change the value AFTER the colon ( : ), keep the comma at the end.
// =====================================================================

export const SETTINGS = {
  // ---- Quiz at each locked door ----
  QUESTIONS_PER_QUIZ: 5,      // how many questions at each door (e.g. 5 or 10)
  CORRECT_TO_UNLOCK: 4,       // how many must be right to open the door (e.g. 4 or 7)

  // ---- Rewards ----
  COINS_PER_CORRECT: 10,      // coins for each answer right on the first try
  COINS_FOR_UNLOCK: 30,       // bonus coins when a door opens
  XP_PER_CORRECT: 10,         // experience points per right answer
  XP_PER_LEVEL: 100,          // XP needed to go up one level

  // ---- Language ----
  DEFAULT_LANGUAGE: "ml",     // "ml" = Malayalam medium, "en" = English medium

  // ---- Which questions to show ----
  SHOW_UNREVIEWED: true,      // true = also show questions marked "reviewed": false
  SHOW_NEEDS_REVIEW: false,   // false = hide questions marked "needsReview": true
  SHUFFLE_OPTIONS: true,      // true = mix up the order of A/B/C/D each time

  // ---- Walking ----
  WALK_SPEED: 3.4,            // how fast the child walks
};
