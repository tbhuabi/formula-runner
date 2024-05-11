import { makeError } from './utils'

import { AST, ASTNode, ASTProgramNode, ASTNodeType } from './ast'

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

export class FormulaRunner {
  private ast = new AST()
  private expression!: string

  constructor(private runner: any,
              private filters: Record<string, Function>) {
  }

  solve(expression: string) {
    this.expression = expression
    const ast = this.ast.ast(expression)
    return this.run(ast)
  }

  private run(ast: ASTProgramNode) {
    return this.calculate(ast, this.runner)
  }

  /* eslint-disable complexity */

  /* eslint-disable max-len */
  private calculate(program: ASTNode, context: any): any {
    switch (program.type) {
      case ASTNodeType.Program: {
        let value
        program.body.forEach((item) => {
          value = this.calculate(item, context)
        })
        return value
      }
      case ASTNodeType.ExpressionStatement:
        return this.calculate(program.expression, context)

      case ASTNodeType.AssignmentExpression: {
        const key = program.left.type === ASTNodeType.Identifier ? program.left.value : this.calculate(program.left, context)
        if (!isString(key) || !isNumber(key)) {
          throw parseMinErr(`表达式${this.expression}有误，不能给${{}.toString.call(key)}赋值！`)
        }
        return context[key] = this.calculate(program.right, context)
      }
      case ASTNodeType.ConditionalExpression:
        return this.calculate(program.test, context) ? this.calculate(program.alternate, context) : this.calculate(program.consequent, context)

      case ASTNodeType.LogicalExpression:
        if (program.operator === '||') {
          return this.calculate(program.left, context) || this.calculate(program.right, context)
        }
        return this.calculate(program.left, context) && this.calculate(program.right, context)

      case ASTNodeType.BinaryExpression: {
        const leftValue: any = this.calculate(program.left, context)
        const rightValue: any = this.calculate(program.right, context)
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
          return +this.calculate(program.argument, context)
        }
        if (program.operator === '-') {
          return -this.calculate(program.argument, context)
        }
        return !this.calculate(program.argument, context)

      case ASTNodeType.CallExpression: {
        const args: any[] = []
        let fn: Function
        program.arguments.forEach((item) => {
          args.push(this.calculate(item, context))
        })
        if (program.filter) {
          const key: any = program.callee.type === ASTNodeType.Identifier ? program.callee.value : this.calculate(program.callee, context)
          if (!isString(key)) {
            throw parseMinErr(`表达式${this.expression}有误，${{}.toString.call(key)}不能做为一个过滤器的名字！`)
          }
          if (!Reflect.has(this.filters, key)) {
            throw parseMinErr(`过滤器${key}未注册！`)
          }
          fn = this.filters[key]
          if (!isFunction(fn)) {
            throw parseMinErr(`过滤器${key}不是一个函数！`)
          }
          return fn(...args)
        }
        fn = this.calculate(program.callee, context)
        return isFunction(fn) ? fn.apply(context, args) : undefined
      }

      case ASTNodeType.MemberExpression:
        return this.calculate(program.property, this.calculate(program.primary, context))

      case ASTNodeType.Identifier:
        return context[program.value]

      case ASTNodeType.Literal:
        return program.value

      case ASTNodeType.ArrayExpression: {
        const arr: any[] = []
        program.elements.forEach((item) => {
          arr.push(this.calculate(item, context))
        })
        return arr
      }

      case ASTNodeType.Property:
        return this.calculate(program.value, context)

      case ASTNodeType.ObjectExpression: {
        const obj: Record<string, any> = {}
        program.properties.forEach((item) => {
          obj[item.key.value] = this.calculate(item, context)
        })
        return obj
      }

      default:
        // ASTNodeType.ThisExpression:
        return context
    }
  }
}
