const fs = require('fs');
let code = fs.readFileSync('components/PhotoA4Generator.tsx', 'utf-8');

code = code.replace(/_updatePhotosState/g, "_setPhotos");

code = code.replace("  const fileInputRef = useRef<HTMLInputElement>(null);", "  const fileInputRef = useRef<HTMLInputElement>(null);\n  const firstSelected = photos.find(p => selectedIds.includes(p.id));");

// Remove the second firstSelected declaration
code = code.replace("  const firstSelected = photos.find(p => selectedIds.includes(p.id));\n\n  const mmToPxPreview = 2.8;", "  const mmToPxPreview = 2.8;");

fs.writeFileSync('components/PhotoA4Generator.tsx', code);
