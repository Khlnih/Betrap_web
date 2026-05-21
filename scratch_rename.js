const fs = require('fs');
const path = require('path');

const imgDir = 'f:/Betrap/assets/images';
const files = fs.readdirSync(imgDir);

files.forEach(f => {
  if (f.startsWith('betrap-') && f.endsWith('.jpg')) {
    const newName = f.replace('betrap-', 'betrap-');
    fs.renameSync(path.join(imgDir, f), path.join(imgDir, newName));
    console.log('Renamed', f, '->', newName);
  }
});

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      if (!dirFile.includes('node_modules') && !dirFile.includes('.git') && !dirFile.includes('assets')) {
        filelist = walkSync(dirFile, filelist);
      }
    } else {
      if (dirFile.endsWith('.html') || dirFile.endsWith('.sql') || dirFile.endsWith('.js') || dirFile.endsWith('.md')) {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
};

const textFiles = walkSync('f:/Betrap');
textFiles.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('betrap-')) {
    let newContent = content.replace(/betrap-/g, 'betrap-');
    fs.writeFileSync(f, newContent);
    console.log('Updated references in', f);
  }
});
