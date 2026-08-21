const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.js') || file.endsWith('.jsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('SafeAreaView') && content.match(/import\s+{[^}]*SafeAreaView[^}]*}\s+from\s+['"]react-native['"]/)) {
    content = content.replace(/(import\s+{[^}]*)(SafeAreaView,?\s*)([^}]*}\s+from\s+['"]react-native['"])/g, '$1$3');
    content = content.replace(/import\s+{\s*}\s+from\s+['"]react-native['"];?\n?/g, '');
    
    if (!content.includes('react-native-safe-area-context')) {
      content = content.replace(/(import\s+.*?from\s+['"]react-native['"];?)/, "$1\nimport { SafeAreaView } from 'react-native-safe-area-context';");
    }
    
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
  }
});

console.log('Modified ' + modifiedCount + ' files to fix SafeAreaView.');
