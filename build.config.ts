import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/index',
    'src/vue',
  ],
  clean: true,
  declaration: true,
  externals: ['vue', '@journeyapps/wa-sqlite'],
  rollup: {
    emitCJS: true,
  },
})
