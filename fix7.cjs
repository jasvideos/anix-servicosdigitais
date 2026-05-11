const fs = require('fs');
let code = fs.readFileSync('components/PhotoA4Generator.tsx', 'utf-8');

// The reason it failed before might be because my regex was `const firstSelected = photos\.find\(p => selectedIds\.includes\(p\.id\)\);\n`.
// If the original declaration was missing, it removed the one I just added.

// I'll just find a solid anchor. Let's put firstSelected right before topBarNode
code = code.replace("  const [topBarNode, setTopBarNode] = useState<HTMLElement | null>(null);", "  const firstSelected = photos.find(p => selectedIds.includes(p.id));\n  const [topBarNode, setTopBarNode] = useState<HTMLElement | null>(null);");

fs.writeFileSync('components/PhotoA4Generator.tsx', code);
