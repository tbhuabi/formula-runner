import { FormulaRunner } from '@tanbo/formula-runner'

const runner = new FormulaRunner()
const obj: any = {}
const result = runner.parse('toNumber() == 2').run({toNumber() {return NaN}})
console.log(result)
