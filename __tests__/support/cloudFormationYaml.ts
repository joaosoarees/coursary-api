import type { ScalarTag, YAMLMap, YAMLSeq } from 'yaml';
import { parse } from 'yaml';

// The short forms of CloudFormation's functions the sls files use, read into their long form
// (`!Ref X` → `{ Ref: 'X' }`), so the parser neither warns nor drops them.
const functions = ['GetAtt', 'Sub', 'Join', 'If', 'Equals', 'Not', 'And', 'Or'];

const scalarTag = (name: string, key: string): ScalarTag => ({
  tag: `!${name}`,
  resolve: (value: string) => ({ [key]: value }),
});

const collectionTag = (name: string, collection: 'seq' | 'map') => ({
  tag: `!${name}`,
  collection,
  resolve: (value: YAMLSeq | YAMLMap) => ({
    [`Fn::${name}`]: value.toJSON() as unknown,
  }),
});

const customTags = [
  scalarTag('Ref', 'Ref'),
  ...functions.flatMap((name) => [
    scalarTag(name, `Fn::${name}`),
    collectionTag(name, 'seq'),
  ]),
];

export const parseCloudFormation = (source: string): unknown =>
  parse(source, { customTags });
