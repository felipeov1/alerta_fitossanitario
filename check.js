const fs = require('fs');

const content = fs.readFileSync('src/v1/App.jsx', 'utf-8');

let braces = 0;
let parens = 0;
let brackets = 0;
let lineNum = 1;

for (let i = 0; i < content.length; i++) {
  const c = content[i];
  if (c === '\n') lineNum++;
  
  if (c === '{') braces++;
  if (c === '}') braces--;
  if (c === '(') parens++;
  if (c === ')') parens--;
  if (c === '[') brackets++;
  if (c === ']') brackets--;
  
  if (braces < 0) {
    console.log(`Extra } at line ${lineNum}`);
    braces = 0;
  }
  if (parens < 0) {
    console.log(`Extra ) at line ${lineNum}`);
    parens = 0;
  }
  if (brackets < 0) {
    console.log(`Extra ] at line ${lineNum}`);
    brackets = 0;
  }
}

console.log(`Final count: braces=${braces}, parens=${parens}, brackets=${brackets}`);
