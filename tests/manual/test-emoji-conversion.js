// Test script to check emoji conversion
const html1 = `<p>Hello <img class="emoji" alt="😊" src="/emoji/smile.png"> world!</p>`;
const html2 = `<p>Testing <img src="data:image/png;base64,emoji" alt="🚀" class="emoji-icon"> rocket</p>`;
const html3 = `<p>Fire emoji <img data-emoji="🔥" src="/path/to/fire.png"> here</p>`;

// Import the conversion function
const { convertEmojiImagesToText } = require('./lib/email-formatter.ts');

console.log('Original 1:', html1);
console.log('Converted 1:', convertEmojiImagesToText(html1));
console.log('');

console.log('Original 2:', html2);
console.log('Converted 2:', convertEmojiImagesToText(html2));
console.log('');

console.log('Original 3:', html3);
console.log('Converted 3:', convertEmojiImagesToText(html3));
