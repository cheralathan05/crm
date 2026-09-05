const fs = require('fs');
let content = fs.readFileSync('prisma/schema.prisma', 'utf8');
content = content.replace(
  'teamName              String?                       // FRONTEND | BACKEND | DATABASE | QA                        // e.g. "Product API", "Order Schema"',
  'teamName              String?                       // FRONTEND | BACKEND | DATABASE | QA'
);
fs.writeFileSync('prisma/schema.prisma', content, 'utf8');
