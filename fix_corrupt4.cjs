const fs = require('fs');
let code = fs.readFileSync('components/PhotoA4Generator.tsx', 'utf-8');

code = code.replace(`               )}
            </>
          )}

        </div>`, `               )}
        </div>`);

fs.writeFileSync('components/PhotoA4Generator.tsx', code);
