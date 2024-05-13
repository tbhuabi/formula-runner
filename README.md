公式执行器
===========================

公式执行器可编译任意 JavaScript 表达式，并执行指定的函数，最终返回计算结果

## 安装
```
npm install @tanbo/formula-runner
```

```ts
import { FormulaRunner } from '@tanbo/formula-runner'

const formulaRunner = new FormulaRunner()

const runner = formulaRunner.parse('IF(SUM(1,3,3)> model.a, SUM(10, 20), "小于等于6")')

const result = runner.run({
  SUM(...args: any[]) {
    return args.reduce((a, b) => a + b, 0)
  },
  IF(test: any, a: any, b: any) {
    return test ? a : b
  },
  model: {
    a: 3
  }
})

console.log(result)
//输出 30

```
