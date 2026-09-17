import js from '@eslint/js';
import ts from 'typescript-eslint';
export default [
 {ignores:['node_modules/**','.reader-assets/**','.impeccable/**','.claude/**']},
 {files:['src/**/*.ts','scripts/**/*.ts'],languageOptions:{parser:ts.parser},rules:{...js.configs.recommended.rules,'no-undef':'off','no-unused-vars':'off','no-empty':['error',{allowEmptyCatch:true}]}},
 {files:['web/**/*.js','hosting/**/*.js','scripts/**/*.mjs'],rules:{...js.configs.recommended.rules,'no-undef':'off','no-unused-vars':'off','no-empty':['error',{allowEmptyCatch:true}]}}
];
