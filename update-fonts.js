const fs = require('fs');
const path = require('path');
const oldFont = /family=Montserrat[^\&]+\&family=Cormorant\+Garamond[^\"']+/g;
const newFont = 'family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800';

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
