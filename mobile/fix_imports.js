const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    if (fs.statSync(file).isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

let modifiedCount = 0;
walk('./src').forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('<SafeAreaView') && !content.includes('react-native-safe-area-context')) {
    content = "import { SafeAreaView } from 'react-native-safe-area-context';\n" + content;
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
  }
});
console.log('Fixed ' + modifiedCount + ' files by adding missing import.');
