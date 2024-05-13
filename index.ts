import { FormulaRunner } from '@tanbo/formula-runner'

const runner = new FormulaRunner({
  toText(v: any, a: any) {
    return 'xxxx' + v + a
  }
})
const obj: any = {}
const result = runner.parse('{a: 10, b: 20}["b"]').run({})
console.log(result)
