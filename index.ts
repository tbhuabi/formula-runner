import { FormulaRunner } from '@tanbo/formula-runner'

const runner = new FormulaRunner({
    SUM(...args: any[]) {
        return args.reduce((a, b) => a + b, 0)
    },
    IF(test: any, a: any, b: any) {
        return test ? a : b
    }
}, {})

const result = runner.solve('IF(SUM(1,3,3)>6, SUM(10, 20), "小于等于6")')

console.log(result)
