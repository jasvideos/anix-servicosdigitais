const fs = require('fs');
let code = fs.readFileSync('components/PhotoA4Generator.tsx', 'utf-8');

code = code.replace(`1089:                )}
1090:         </div>
1091:       </div>
1092:       {/* WORKSPACE PREVIEW AREA */}`.replace(/\d+: /g, ""), `               )}
            </div>
         </div>
      </div>
      {/* WORKSPACE PREVIEW AREA */}`);

fs.writeFileSync('components/PhotoA4Generator.tsx', code);
