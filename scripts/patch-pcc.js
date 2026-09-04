const fs = require('fs');

let content = fs.readFileSync('src/components/projects/project-command-center.tsx', 'utf8');

// 1. Add import if not present
if (!content.includes('import { AdminProjectTeamView }')) {
  content = 'import { AdminProjectTeamView } from "./admin-project-team-view";\n' + content;
}

// 2. Replace view === "team" block
const startMarker = '{view === "team" && (';
const endMarker = '{view === "changes" && (';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  // Find the closing )} before endMarker
  const beforeEnd = content.lastIndexOf(')}', endIndex);
  if (beforeEnd !== -1) {
    const replacement = `{view === "team" && (
          <AdminProjectTeamView
            projectId={project.id}
            projectName={project.name}
            onNavigateTab={(tab, ctx) => {
              if (tab === "communication") {
                setView("communication");
                if (ctx?.targetConversationId) {
                  setSelectedAdminConversationId(ctx.targetConversationId);
                }
              }
            }}
          />
        )}

        `;
    content = content.slice(0, startIndex) + replacement + content.slice(endIndex);
    fs.writeFileSync('src/components/projects/project-command-center.tsx', content, 'utf8');
    console.log('ProjectCommandCenter updated with AdminProjectTeamView successfully!');
  } else {
    console.error('Could not find closing parenthesis for team view');
  }
} else {
  console.error('Could not find start or end markers for team view', { startIndex, endIndex });
}
