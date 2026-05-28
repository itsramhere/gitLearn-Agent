const fs = require('fs');
['tests/test_claim_issue.ts', 'tests/test_find_issue.ts', 'tests/test_update_checker.ts'].forEach(fp => {
  let code = fs.readFileSync(fp, 'utf8');
  if (!code.includes('UserRepository')) {
    code = "import { UserRepository } from '../src/repositories/UserRepository';\n" + code;
    fs.writeFileSync(fp, code);
  }
});
