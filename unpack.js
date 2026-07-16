const fs = require('fs');
const html = fs.readFileSync('src/components/site/Dashboard.html', 'utf8');

const manifestMatch = html.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
const templateMatch = html.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);

if (manifestMatch) {
  fs.writeFileSync('manifest.json', manifestMatch[1]);
}
if (templateMatch) {
  fs.writeFileSync('template.json', templateMatch[1]);
}
console.log('Done unpacking');
