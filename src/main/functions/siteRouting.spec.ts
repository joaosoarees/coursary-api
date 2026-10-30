import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';

import { describe, expect, it } from 'vitest';

import { parseCloudFormation } from '@tests/support/cloudFormationYaml';

interface Template {
  Resources: {
    SiteRoutingFunction: { Properties: { FunctionCode: string } };
  };
}

const root = path.resolve(import.meta.dirname, '../../..');
const template = parseCloudFormation(
  readFileSync(path.join(root, 'sls/resources/web/Site.yml'), 'utf8'),
) as Template;

// The CloudFront Function's own code, run apart as CloudFront runs it: handler(event) → request.
const handler = runInNewContext(
  `${template.Resources.SiteRoutingFunction.Properties.FunctionCode}; handler;`,
  {},
) as (event: { request: { uri: string } }) => { uri: string };

const route = (uri: string) => handler({ request: { uri } }).uri;

describe('site routing function (Q475)', () => {
  it("should send the SPA's routes to index.html", () => {
    expect(route('/')).toBe('/index.html');
    expect(route('/cursos/abc')).toBe('/index.html');
    expect(route('/cursos/abc/aulas/def/')).toBe('/index.html');
  });

  it('should leave files alone, so a missing one answers its own error', () => {
    expect(route('/assets/index-3f2a.js')).toBe('/assets/index-3f2a.js');
    expect(route('/favicon.ico')).toBe('/favicon.ico');
    expect(route('/assets/missing.css')).toBe('/assets/missing.css');
  });
});
