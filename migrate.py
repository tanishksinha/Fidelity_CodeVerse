import re

# 1. Update UserConstellation.js
with open('UserConstellation_war_room_utf8.js', 'r', encoding='utf-8') as f:
    const_code = f.read()

const_code = re.sub(
    r'  // Pre-populate with beautiful demo stars.*?setUsers\(Array\.from\(usersRef\.current\.values\(\)\)\);\n  \}, \[\]\);\n',
    '',
    const_code,
    flags=re.DOTALL
)

with open('frontend/components/admin/UserConstellation.js', 'w', encoding='utf-8') as f:
    f.write(const_code)

# 2. Update page.js
with open('admin_page_war_room_utf8.js', 'r', encoding='utf-8') as f:
    page_code = f.read()

page_code = page_code.replace(
    'import LiveFunnel from "@/components/admin/LiveFunnel";',
    'import UserConstellation from "@/components/admin/UserConstellation";'
)

funnel_usage = '''          {/* Funnel */}
          <LiveFunnel
            funnel={funnelData}
            onNodeClick={(node) => {
              if (node.status === "loss" || node.status === "hesitating") {
                const searchStage = node.label.toLowerCase() === "bounce" ? "bounced" : node.label.toLowerCase();
                const firstSession = sessionRecords.find(
                  (s) => s.stage.toLowerCase() === searchStage
                );
                if (firstSession) openInspector(firstSession);
              }
            }}
          />'''

page_code = page_code.replace(funnel_usage, '          {/* Constellation Map */}\n          <UserConstellation />')

with open('frontend/app/admin/page.js', 'w', encoding='utf-8') as f:
    f.write(page_code)
print('Migration complete')
