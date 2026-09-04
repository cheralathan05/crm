const fs = require('fs');
let content = fs.readFileSync('prisma/schema.prisma', 'utf8');
content = content.replace(
  '  staffAllocations     ProjectStaffAllocation[]',
  '  staffAllocations     ProjectStaffAllocation[]\r\n  invitations          EmployeeInvitation[]'
);
fs.writeFileSync('prisma/schema.prisma', content, 'utf8');
console.log('Added invitations relation to ClientProject');
