const fs = require('fs');
const path = require('path');
const { createCoverageMap } = require('istanbul-lib-coverage');
const { createContext } = require('istanbul-lib-report');
const reports = require('istanbul-reports');

const root = path.resolve(__dirname, '..');
const coverageMap = createCoverageMap({});
for (const suite of ['unit', 'mysql']) {
  const filename = path.join(root, 'coverage', suite, 'coverage-final.json');
  if (!fs.existsSync(filename)) throw new Error(`Falta cobertura de ${suite}; execute npm run test:coverage com MySQL de teste disponível`);
  coverageMap.merge(JSON.parse(fs.readFileSync(filename, 'utf8')));
}
const context = createContext({ dir: path.join(root, 'coverage', 'combined'), coverageMap });
for (const format of ['text-summary', 'html', 'lcovonly', 'json-summary']) reports.create(format).execute(context);
