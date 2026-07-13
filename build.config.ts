import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/index',
    'src/prod',
    'src/vue',
    'src/vue-prod',
  ],
  clean: true,
  declaration: true,
  externals: ['vue', '@journeyapps/wa-sqlite'],
  rollup: {
    emitCJS: true,
  },
})
