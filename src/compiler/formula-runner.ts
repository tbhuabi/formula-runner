import { makeError } from './utils'

import { AST, ASTNode, ASTNodeType } from './ast'

function isType(type: string) {
  return function (obj: any) {
    return {}.toString.call(obj) == '[object ' + type + ']'
  }
}

const isString = isType('String')
const isFunction = isType('Function')
const isNumber = function (val: any) {
  return typeof val === 'number'
}

const parseMinErr = makeError('FormulaRunner')

export interface Runner {
  run(model: any): any
}

export class FormulaRunner {
  private ast = new AST()
  private expression!: string

  constructor(private filters: Record<string, Function> = {}) {
  }

  parse(expression: string): Runner {
    this.expression = expression
    const ast = this.ast.ast(expression)
    return {
      run: (model: any) => {
        return this.calculate(ast, model, model)
      }
    }
  }

  /* eslint-disable complexity */

  /* eslint-disable max-len */
  private calculate(program: ASTNode, context: any, root: any): any {
    switch (program.type) {
      case ASTNodeType.Program: {
        let value
        program.body.forEach((item) => {
          value = this.calculate(item, context, root)
        })
        return value
      }
      case ASTNodeType.ExpressionStatement:
        return this.calculate(program.expression, context, root)

      case ASTNodeType.AssignmentExpression: {
        const key = program.left.type === ASTNodeType.Identifier ? program.left.value : this.calculate(program.left, context, root)
        if (!isString(key) && !isNumber(key)) {
          throw parseMinErr(`表达式${this.expression}有误，不能给${{}.toString.call(key)}赋值！`)
        }
        return context[key] = this.calculate(program.right, root, root)
      }
      case ASTNodeType.ConditionalExpression:
        return this.calculate(program.test, root, root) ? this.calculate(program.alternate, root, root) : this.calculate(program.consequent, root, root)

      case ASTNodeType.LogicalExpression:
        if (program.operator === '||') {
          return this.calculate(program.left, root, root) || this.calculate(program.right, root, root)
        }
        return this.calculate(program.left, root, root) && this.calculate(program.right, root, root)

      case ASTNodeType.BinaryExpression: {
        const leftValue: any = this.calculate(program.left, context, root)
        const rightValue: any = this.calculate(program.right, root, root)
        switch (program.operator) {
          case '+':
            return leftValue + rightValue
          case '-':
            return leftValue - rightValue
          case '*':
            return leftValue * rightValue
          case '/':
            return leftValue / rightValue
          case '%':
            return leftValue % rightValue
          case '>':
            return leftValue > rightValue
          case '>=':
            return leftValue >= rightValue
          case '<':
            return leftValue < rightValue
          case '<=':
            return leftValue <= rightValue
          case '==':
            return leftValue == rightValue || isNaN(leftValue) && isNaN(rightValue)
          case '!=':
            return leftValue != rightValue
          case '===':
            return leftValue === rightValue || isNaN(leftValue) && isNaN(rightValue)
          default :
            return leftValue !== rightValue
        }
      }

      case ASTNodeType.UnaryExpression:
        if (program.operator === '+') {
          return +this.calculate(program.argument, root, root)
        }
        if (program.operator === '-') {
          return -this.calculate(program.argument, root, root)
        }
        return !this.calculate(program.argument, root, root)

      case ASTNodeType.CallExpression: {
        const args: any[] = []
        let fn: Function
        program.arguments.forEach((item) => {
          args.push(this.calculate(item, root, root))
        })
        if (program.filter) {
          const key = program.callee.value
          // if (!isString(key)) {
          //   throw parseMinErr(`表达式${this.expression}有误，${{}.toString.call(key)}不能做为一个过滤器的名字！`)
          // }
          if (!Reflect.has(this.filters, key)) {
            throw parseMinErr(`过滤器${key}未注册！`)
          }
          fn = this.filters[key]
          if (!isFunction(fn)) {
            throw parseMinErr(`过滤器${key}不是一个函数！`)
          }
          return fn(...args)
        }
        fn = this.calculate(program.callee, context, root)
        if (isFunction(fn)) {
          return fn.apply(context, args)
        }
        throw parseMinErr(`未找到方法 "${program.callee.value}"`)
      }

      case ASTNodeType.MemberExpression:
        const host = this.calculate(program.primary, context, root)
        if (program.property.type === ASTNodeType.Literal) {
          return host[program.property.value as string]
        }
        return this.calculate(program.property, host, root)

      case ASTNodeType.Identifier:
        return context[program.value]

      case ASTNodeType.Literal:
        return program.value

      case ASTNodeType.ArrayExpression: {
        const arr: any[] = []
        program.elements.forEach((item) => {
          arr.push(this.calculate(item, root, root))
        })
        return arr
      }

      case ASTNodeType.Property:
        return this.calculate(program.value, root, root)

      case ASTNodeType.ObjectExpression: {
        const obj: Record<string, any> = {}
        program.properties.forEach((item) => {
          obj[item.key.value] = this.calculate(item, root, root)
        })
        return obj
      }

      default:
        // ASTNodeType.ThisExpression:
        return root
    }
  }
}
