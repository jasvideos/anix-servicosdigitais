const fs = require('fs');
let code = fs.readFileSync('components/PhotoA4Generator.tsx', 'utf-8');

// I will move firstSelected declaration to line 180 or so, right after selectedIds state.
let moveTarget = "const [selectedIds, setSelectedIds] = useState<string[]>([]);";
let addFirstSelected = "const [selectedIds, setSelectedIds] = useState<string[]>([]);\n  const firstSelected = photos.find(p => selectedIds.includes(p.id));";

code = code.replace(moveTarget, addFirstSelected);

// Let's remove the other declaration(s) of firstSelected using regex
code = code.replace(/const firstSelected = photos\.find\(p => selectedIds\.includes\(p\.id\)\);\n/g, "");

fs.writeFileSync('components/PhotoA4Generator.tsx', code);
