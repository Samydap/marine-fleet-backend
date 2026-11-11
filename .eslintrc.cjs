/* eslint-env node */
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: ['plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
  root: true,
  env: { node: true, jest: true },
  ignorePatterns: ['.eslintrc.cjs', 'dist', 'coverage', 'commitlint.config.cjs'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/consistent-type-imports': 'warn',
    'no-console': ['error', { allow: ['warn', 'error'] }],
    complexity: ['warn', 12],
    'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
  },
  overrides: [
    {
      // El dominio debe quedar limpio de framework e infraestructura.
      files: ['src/modules/*/domain/**/*.ts', 'src/shared/domain/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              { group: ['@nestjs/*'], message: 'El dominio no depende de NestJS.' },
              { group: ['typeorm', 'mysql2'], message: 'El dominio no depende del ORM.' },
              {
                group: ['**/infrastructure/**', '@shared/infrastructure/**'],
                message: 'El dominio no depende de infraestructura.',
              },
              {
                group: ['**/presentation/**'],
                message: 'El dominio no depende de presentacion.',
              },
            ],
          },
        ],
      },
    },
    {
      // Los casos de uso hablan con puertos, no con adaptadores.
      files: ['src/modules/*/application/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/infrastructure/**', '@shared/infrastructure/**'],
                message: 'Usa el puerto del dominio, no el adaptador.',
              },
            ],
          },
        ],
      },
    },
    {
      // Los controllers no saltan la capa de aplicacion.
      files: ['src/modules/*/presentation/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/infrastructure/**'],
                message: 'El controller invoca casos de uso, no adaptadores.',
              },
            ],
          },
        ],
      },
    },
    {
      // EXCEPCION DELIBERADA (ver ADR 0002): las entidades viven en domain/ con
      // los decoradores de mapeo de TypeORM. El modelo es "de dominio anotado
      // para persistencia", no un modelo puro con entidades espejo en
      // infrastructure/. Se evitan 15 clases duplicadas y 15 mappers.
      //
      // Lo que sigue prohibido incluso en las entidades: mysql2, NestJS,
      // infrastructure/ y presentation/. El resto de domain/ (value objects,
      // politicas, servicios de dominio) no puede tocar TypeORM en absoluto.
      files: ['src/modules/*/domain/**/*.entity.ts', 'src/shared/domain/**/*.entity.ts'],
      rules: {
        'max-lines': 'off',
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              { group: ['@nestjs/*'], message: 'Una entidad no depende de NestJS.' },
              { group: ['mysql2', 'mysql2/*'], message: 'Una entidad no usa el driver directo.' },
              {
                group: ['**/infrastructure/**', '@shared/infrastructure/**'],
                message: 'El dominio no depende de infraestructura.',
              },
              {
                group: ['**/presentation/**'],
                message: 'El dominio no depende de presentacion.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['src/shared/infrastructure/database/migrations/*.ts'],
      rules: { 'max-lines': 'off', '@typescript-eslint/explicit-function-return-type': 'off' },
    },
  ],
};
