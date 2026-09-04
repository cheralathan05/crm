const fs = require('fs');

let content = fs.readFileSync('prisma/schema.prisma', 'utf8');

// 1. Add invitations to ClientProject if not present
if (!content.includes('invitations          EmployeeInvitation[]')) {
  content = content.replace(
    /staffAllocations\s+ProjectStaffAllocation\[\]/,
    'staffAllocations     ProjectStaffAllocation[]\n  invitations          EmployeeInvitation[]'
  );
}

// 2. Add projectId, teamName, projectRole to EmployeeInvitation if not present
if (!content.includes('projectId        String?')) {
  content = content.replace(
    /model EmployeeInvitation\s*\{(\r?\n)\s*id\s+String\s+@id\s+@default\(cuid\(\)\)/,
    'model EmployeeInvitation {$1  id               String            @id @default(cuid())$1  projectId        String?$1  project          ClientProject?    @relation(fields: [projectId], references: [id], onDelete: SetNull)$1  teamName         String?           // FRONTEND | BACKEND | DATABASE | QA$1  projectRole      String?           // e.g. Frontend Developer'
  );
}

fs.writeFileSync('prisma/schema.prisma', content, 'utf8');
console.log('Fixed schema patch applied!');
