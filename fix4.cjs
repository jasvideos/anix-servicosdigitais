const fs = require('fs');
let code = fs.readFileSync('components/PhotoA4Generator.tsx', 'utf-8');

const replaceStr1 = `const PhotoA4Generator: React.FC = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [photos, _setPhotos] = useState<PhotoItem[]>([]);

  const updatePhotosState = (val: any) => {
    if (typeof val === 'function') {
      _setPhotos(prev => {
        const next = val(prev);
        if (!isUndoing) setHistory(pd => [...pd, next].slice(-20) as any);
        return next;
      });
    } else {
      _setPhotos(val);
      if (!isUndoing) setHistory(pd => [...pd, val].slice(-20) as any);
    }
  };

  const handleUndo = () => {
    if (history.length > 1) {
      setIsUndoing(true);
      const prev = history[history.length - 2];
      setHistory(pd => pd.slice(0, -1));
      _setPhotos(prev);
      setTimeout(() => setIsUndoing(false), 50);
    }
  };
`;

code = code.replace("const PhotoA4Generator: React.FC = () => {\n  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);\n  const [photos, setPhotos] = useState<PhotoItem[]>([]);", replaceStr1);

code = code.replace(/setPhotos\(/g, "updatePhotosState(");
code = code.replace("_updatePhotosState(", "_setPhotos("); // fix accidental replace in my script

fs.writeFileSync('components/PhotoA4Generator.tsx', code);
