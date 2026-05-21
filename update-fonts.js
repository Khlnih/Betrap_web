const fs = require('fs');
const path = require('path');
const oldFont = /family=Be\+Vietnam\+Pro[^\&]+\&family=Playfair\+Display[^\"']+/g;
const newFont = 'family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600';

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      if (!dirFile.includes('node_modules') && !dirFile.includes('.git')) {
        filelist = walkSync(dirFile, filelist);
      }
    } else {
      if (dirFile.endsWith('.html')) {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
};

const files = walkSync('f:/Betrap');
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  if (c.match(oldFont)) {
    c = c.replace(oldFont, newFont);
    fs.writeFileSync(f, c);
    console.log('Updated font in: ' + f);
  }
});
console.log('Done HTML fonts.');
