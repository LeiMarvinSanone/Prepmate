// constants/defaultSuggestions.js
// Default item suggestions shown when a user has no personal history yet.
// Keyed by category id — must match the ids in constants/categories.js.
// Keep each list to 10 items max so the chip row doesn't overflow the screen.

export const DEFAULT_SUGGESTIONS = {
  outdoor: [
    'Sunscreen',
    'Water Bottle',
    'Insect Repellent',
    'First Aid Kit',
    'Dry Bag',
    'Hat / Cap',
    'Extra Clothes',
    'Snacks',
    'Power Bank',
    'Flashlight',
  ],

  formal: [
    'ID / Passport',
    'Business Cards',
    'Notebook & Pen',
    'Formal Shoes',
    'Belt',
    'Watch',
    'Pressed Clothes',
    'Portfolio / Folder',
    'Breath Mints',
    'Umbrella',
  ],

  travel: [
    'Passport',
    'Travel Tickets',
    'Charger',
    'Power Bank',
    'Toiletries',
    'Extra Clothes',
    'Travel Pillow',
    'Snacks',
    'Local Currency',
    'Earphones',
  ],

  school: [
    'Notebook',
    'Pen & Pencil',
    'Calculator',
    'Textbooks',
    'Water Bottle',
    'Lunch / Snacks',
    'USB Drive',
    'Laptop / Tablet',
    'Student ID',
    'Earphones',
  ],

  indoor: [
    'Snacks',
    'Water Bottle',
    'Charger',
    'Blanket',
    'Earphones / Headphones',
    'Remote Control',
    'Notebook',
    'Phone',
    'Laptop',
    'Extension Cord',
  ],

  more: [
    'Water Bottle',
    'Power Bank',
    'Charger',
    'Extra Clothes',
    'Snacks',
    'First Aid Kit',
    'Umbrella',
    'Earphones',
    'Notebook & Pen',
    'Hand Sanitizer',
  ],

  // custom events get a generic helpful set
  custom: [
    'Water Bottle',
    'Power Bank',
    'Charger',
    'Snacks',
    'Extra Clothes',
    'Umbrella',
    'Notebook & Pen',
    'Earphones',
    'Hand Sanitizer',
    'First Aid Kit',
  ],
};