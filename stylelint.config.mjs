// U1 and U3 on top of the standard config. tokens.css is the one file that may hold raw values.
const stylelintConfig = {
  extends: ['stylelint-config-standard'],
  rules: {
    'color-no-hex': true,
    'unit-disallowed-list': ['px'],
    'selector-max-id': 0,
    'declaration-no-important': true,
  },
  overrides: [
    {
      // rule-nesting-at-rule-required-list matches the at-rule name ("layer"),
      // so layer-name-pattern is what pins the layer to components.
      files: ['src/components/ui/**/*.module.css'],
      rules: {
        'rule-nesting-at-rule-required-list': ['layer'],
        'layer-name-pattern': '^components$',
      },
    },
    {
      files: ['src/styles/tokens.css'],
      rules: {
        'color-no-hex': null,
        'unit-disallowed-list': null,
      },
    },
  ],
};

export default stylelintConfig;
