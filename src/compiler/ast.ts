import { makeError } from './utils'

import { Lexer, Token } from './lexer'

const astMinErr = makeError('AST')

export enum ASTNodeType {
  Program = 'Program',
  ExpressionStatement = 'ExpressionStatement', // 表达式语句
  AssignmentExpression = 'AssignmentExpression', // 赋值表达式
  ConditionalExpression = 'ConditionalExpression', // 条件表达式
  LogicalExpression = 'LogicalExpression', // 逻辑表达式
  BinaryExpression = 'BinaryExpression', // 二元运算表达式
  UnaryExpression = 'UnaryExpression', // 一元运算表达式
  CallExpression = 'CallExpression', // 函数调用表达式
  MemberExpression = 'MemberExpression', // 成员表达式
  Identifier = 'Identifier', // 标识符
  Literal = 'Literal', // 文本常量
  ArrayExpression = 'ArrayExpression', // 数组表达式
  Property = 'Property', // 属性表达式
  ObjectExpression = 'ObjectExpression', // 对象表达式
  ThisExpression = 'ThisExpression', // this表达式
}

export interface ASTConstantNode {
  type: ASTNodeType.Literal | ASTNodeType.ThisExpression
  value?: boolean | null
}

export interface ASTIdentifierNode {
  type: ASTNodeType.Identifier
  value: string
}

export interface ASTLiteralNode {
  type: ASTNodeType.Literal
  value: string | number
}

export interface ASTProgramNode {
  type: ASTNodeType.Program
  body: ASTNode[]
}

export interface ASTExpressionStatementNode {
  type: ASTNodeType.ExpressionStatement
  expression: any
}

export interface ASTConditionalExpressionNode {
  type: ASTNodeType.ConditionalExpression
  test: ASTNode
  alternate: ASTNode
  consequent: ASTNode
}

export interface ASTUnaryExpressionNode {
  type: ASTNodeType.UnaryExpression
  operator: '+' | '-' | '!'
  argument: ASTNode
}

export interface ASTBinaryExpressionNode {
  type: ASTNodeType.BinaryExpression
  left: ASTNode,
  operator: '==' | '!=' | '!==' | '===' | '<' | '>' | '<=' | '>=' | '+' | '-' | '*' | '/' | '%'
  right: ASTNode
}

export interface ASTAssignmentExpressionNode {
  type: ASTNodeType.AssignmentExpression
  operator: '='
  left: ASTNode
  right: ASTNode
}

export interface ASTPropertyNode {
  type: ASTNodeType.Property
  key: ASTIdentifierNode | ASTLiteralNode
  value: ASTNode
}

export interface ASTCallExpressionNode {
  type: ASTNodeType.CallExpression
  callee: ASTIdentifierNode
  arguments: ASTNode[]
  filter?: boolean
}

export interface ASTLogicalExpressionNode {
  type: ASTNodeType.LogicalExpression
  operator: '||' | '&&'
  left: ASTNode
  right: ASTNode
}

export interface ASTMemberExpressionNode {
  type: ASTNodeType.MemberExpression
  primary: ASTNode
  property: ASTNode
}

export interface ASTArrayExpressionNode {
  type: ASTNodeType.ArrayExpression
  elements: ASTNode[]
}

export interface ASTObjectExpressionNode {
  type: ASTNodeType.ObjectExpression
  properties: ASTPropertyNode[]
}

export type ASTNode = ASTConstantNode |
  ASTIdentifierNode |
  ASTProgramNode |
  ASTExpressionStatementNode |
  ASTUnaryExpressionNode |
  ASTBinaryExpressionNode |
  ASTAssignmentExpressionNode |
  ASTPropertyNode |
  ASTCallExpressionNode |
  ASTConditionalExpressionNode |
  ASTLogicalExpressionNode |
  ASTMemberExpressionNode |
  ASTArrayExpressionNode |
  ASTObjectExpressionNode |
  ASTLiteralNode

export class AST {
  private text!: string
  private tokens!: Token[]

  private lexer = new Lexer()

  private constants: Record<string, ASTConstantNode> = {
    'true': {
      type: ASTNodeType.Literal,
      value: true
    },
    'false': {
      type: ASTNodeType.Literal,
      value: false
    },
    'null': {
      type: ASTNodeType.Literal,
      value: null
    },
    'undefined': {
      type: ASTNodeType.Literal,
      value: undefined
    },
    'this': {
      type: ASTNodeType.ThisExpression
    }
  }

  ast(text: string) {
    this.text = text

    // 分析词法
    this.tokens = this.lexer.lex(text)
    // 构建一个项目
    const value = this.program()

    if (this.tokens.length !== 0) {
      // 如果项目构建完，但当前的词法单元并未用完，则判定当前表达式不正确
      throw astMinErr(`表达式：${text}中，"${this.tokens[0].text}" 没用使用`)
    }
    return value
  }

  private program(): ASTProgramNode {
    const body: ASTNode[] = []
    while (true) {
      // 循环this.tokens中的每一项
      if (this.tokens.length > 0 && !this.peek('}', ')', ';', ']')) {
        // 如果tokens中还有元素，则创建抽象语法树
        body.push(this.expressionStatement())
      }
      if (!this.expect(';')) {
        return {
          type: ASTNodeType.Program,
          body: body
        }
      }
    }
  }

  private expressionStatement(): ASTExpressionStatementNode {
    // 返回一个表达式单元
    return {
      type: ASTNodeType.ExpressionStatement,
      // 每一项元素都有可能通过滤器来格式化当前计算后的结果，所以先从过滤器分析
      expression: this.filterChain()
    }
  }

  private filterChain() {
    // 过滤器规则 value | filter，但value的值没有，所以先计算value的表达式
    let left = this.expression()
    while (this.expect('|')) {
      left = this.filter(left)
    }
    return left
  }

  private expression() {
    return this.assignment()
  }

  private assignment(): ASTNode {
    // 先求构建左边的表达式
    let result: ASTNode = this.ternary()
    // 如果下一项为 = 号，则当前表达式为赋值运算，否则直接返回左边的值
    if (this.expect('=')) {
      result = {
        type: ASTNodeType.AssignmentExpression,
        left: result,
        operator: '=',
        right: this.assignment()
      }
    }
    return result
  }

  private ternary(): ASTNode {
    // 三元运算 boolean ? trueExpression : falseExpression
    const test = this.logicalOR() //  a || b ? true : false
    if (this.expect('?')) {
      const alternate = this.expression()
      if (this.expect(':')) {
        const consequent = this.expression()
        if (!consequent) {
          throw astMinErr(`条件表达式不正确，缺少 false 分支语句。`)
        }
        return {
          type: ASTNodeType.ConditionalExpression,
          test: test,
          alternate,
          consequent
        }
      }
    }
    return test
  }

  private logicalOR() {
    // 或者 a || b
    let left = this.logicalAND() // a && b || c;
    while (this.expect('||')) {
      // a || b || c
      const right = this.logicalAND() // 运算优先级，后面一定不是三目（?:）运算表达式
      if (typeof right === 'undefined') {
        throw astMinErr(`${this.text} 不是一个正确的表达式，二元表达式缺少右项。`)
      }
      left = {
        type: ASTNodeType.LogicalExpression,
        left: left,
        operator: '||',
        right
      }
    }
    return left
  }

  private logicalAND() {
    // 并且 a && b
    let left = this.equality() //  a == b && c

    while (this.expect('&&')) {
      //  a && b && c
      const right = this.equality() // 运算优先级，后面一定不是三目（?:），或者（||）运算表达式
      if (typeof right === 'undefined') {
        throw astMinErr(`${this.text} 不是一个正确的表达式，二元表达式缺少右项。`)
      }
      left = {
        type: ASTNodeType.LogicalExpression,
        left: left,
        operator: '&&',
        right
      }
    }
    return left
  }

  private equality() {
    // 相等 a == b
    let left: ASTNode = this.relational() //  a <= b == c
    while (true) {
      //  a == b == c
      const token = this.expect('==', '!=', '!==', '===')
      if (!token) {
        break
      }
      const right = this.relational()
      if (typeof right === 'undefined') {
        throw astMinErr(`${this.text} 不是一个正确的表达式，二元表达式缺少右项。`)
      }
      left = {
        type: ASTNodeType.BinaryExpression,
        left: left,
        operator: token.text as ASTBinaryExpressionNode['operator'],
        right
      }
    }
    return left
  }

  private relational() {
    // 关系运算 a <= b
    let left: ASTNode = this.additive() //  a + b <= c
    while (true) {
      //  a < b < c
      const token = this.expect('<', '>', '<=', '>=')
      if (!token) {
        break
      }
      const right = this.additive()
      if (typeof right === 'undefined') {
        throw astMinErr(`${this.text} 不是一个正确的表达式，二元表达式缺少右项。`)
      }
      left = {
        type: ASTNodeType.BinaryExpression,
        left,
        operator: token.text as ASTBinaryExpressionNode['operator'],
        right
      }
    }
    return left
  }

  private additive() {
    // 加减法运算 a + b
    let left: ASTNode = this.multiplicative() //  a * b + c
    while (true) {
      //  a + b + c
      const token = this.expect('+', '-')
      if (!token) {
        break
      }
      const right = this.multiplicative()
      if (typeof right === 'undefined') {
        throw astMinErr(`${this.text} 不是一个正确的表达式，二元表达式缺少右项。`)
      }
      left = {
        type: ASTNodeType.BinaryExpression,
        left: left,
        operator: token.text as ASTBinaryExpressionNode['operator'],
        right
      }
    }
    return left
  }

  private multiplicative() {
    // 乘除模运算 a * b
    let left: ASTNode = this.unary() //  -a * b
    while (true) {
      const token = this.expect('*', '/', '%')
      if (!token) {
        break
      }
      const right = this.unary()
      if (typeof right === 'undefined') {
        throw astMinErr(`${this.text} 不是一个正确的表达式，二元表达式缺少右项。`)
      }
      left = {
        type: ASTNodeType.BinaryExpression,
        left: left,
        operator: token.text as ASTBinaryExpressionNode['operator'],
        right
      }
    }
    return left
  }

  private unary(): ASTNode {
    const token = this.expect('+', '-', '!')
    if (token) {
      const argument = this.unary()
      if (!argument) {
        throw astMinErr(`${this.text} 不是一个正确的表达式，一元表达式缺少右项。`)
      }
      return {
        type: ASTNodeType.UnaryExpression,
        operator: token.text as ASTUnaryExpressionNode['operator'],
        argument
      }
    }
    // 如果不是以上所有情况，则判定当前表达式的构建逻辑为()优先运算符，或者是[]数组、{}json
    return this.primary()
  }

  private primary() {
    let primary: ASTNode | undefined
    if (this.expect('(')) {
      primary = this.filterChain() // 括号内可能包含任意元素
      this.consume(')')
    } else if (this.expect('[')) {
      primary = this.arrayDeclaration()
    } else if (this.expect('{')) {
      primary = this.object()
    } else {
      const peek = this.peek()
      if (peek) {
        if (Reflect.has(this.constants, peek.text)) {
          primary = this.constants[this.consume().text]
        } else if (peek.identifier) {
          primary = this.identifier()
        } else if (peek.constant) {
          primary = this.constant()
        } else {
          // 如果以上所有情况都不匹配，则判定表达式不正确
          throw astMinErr(`${peek.text}不是一个正确的表达式`)
        }
      }
    }
    // 有可能出现取属性：[1,2][0]，{key:value}[key]，a.b.c
    // 也有可能是函数调用：fn(a,b)
    while (true) {
      const next = this.expect('[', '(', '.')
      if (!next) {
        break
      }
      if (next.text === '[') {
        // 取一个对象的属性
        primary = {
          type: ASTNodeType.MemberExpression,
          primary: primary!,
          property: this.expression()
        }
        this.consume(']')
      } else if (next.text === '(') {
        primary = {
          type: ASTNodeType.CallExpression,
          callee: primary! as ASTIdentifierNode,
          arguments: this.parseArguments()
        }
        this.consume(')')
      } else {
        primary = {
          type: ASTNodeType.MemberExpression,
          primary: primary!,
          property: this.expression()
        }
      }
    }
    return primary
  }

  private parseArguments() {
    const args = []
    const peek = this.peek()
    if (peek && peek.text !== ')') {
      do {
        args.push(this.expression())
      } while (this.expect(','))
    }
    return args
  }

  private filter(baseExpression: ASTNode) {
    const args = [baseExpression]
    const result: ASTCallExpressionNode = {
      type: ASTNodeType.CallExpression,
      callee: this.identifier(),
      arguments: args,
      filter: true
    }
    while (this.expect(':')) {
      args.push(this.expression())
    }
    return result
  }

  private object(): ASTObjectExpressionNode {
    const properties = []
    let property: ASTPropertyNode
    if (!this.peek('}')) {
      do {
        if (this.peek('}')) {
          // ECMA5 支持 {key:value,key:value,} 最后一个元素后面可以有逗号
          break
        }
        property = {
          type: ASTNodeType.Property
        } as ASTPropertyNode
        const peek = this.peek()
        if (peek) {
          if (peek.identifier) {
            property.key = this.identifier()
          } else {
            throw astMinErr(`${peek.text}不能作为一个标识符或属性名！`)
          }
        }
        this.consume(':')
        property.value = this.expression()
        properties.push(property)
      } while (this.expect(','))
    }
    this.consume('}')
    return {
      type: ASTNodeType.ObjectExpression,
      properties: properties
    }
  }

  private identifier(): ASTIdentifierNode {
    const token = this.consume()
    if (token.identifier) {
      return {
        type: ASTNodeType.Identifier,
        value: token.text
      }
    }
    throw astMinErr(`${token.text}不能作为一个标识符或属性名！`)
  }

  private constant(): ASTLiteralNode {
    return {
      type: ASTNodeType.Literal,
      value: this.consume().value
    }
  }

  private arrayDeclaration(): ASTArrayExpressionNode {
    const elements: ASTNode[] = []
    if (!this.peek(']')) {
      do {
        if (this.peek(']')) {
          // ECMA5 支持 [1,3,] 最后一个元素后面可以有逗号
          break
        }
        elements.push(this.expression())
      } while (this.expect(','))
    }
    this.consume(']')
    return {
      type: ASTNodeType.ArrayExpression,
      elements: elements
    }
  }

  private expect(e1?: string, e2?: string, e3?: string, e4?: string) {
    const token = this.peek(e1, e2, e3, e4)
    if (token) {
      this.tokens.shift()
      return token
    }
    return false
  }

  private peek(e1?: string, e2?: string, e3?: string, e4?: string) {
    if (this.tokens.length) {
      const token = this.tokens[0]
      const text = token.text
      if (text === e1 || text === e2 || text === e3 || text === e4 || !e1 && !e2 && !e3 && !e4) {
        return token
      }
    }
    return false
  }

  private consume(e1?: string) {
    if (this.tokens.length) {
      const token = this.expect(e1)
      if (token) return token
    }
    throw astMinErr(`解析表达式出错，${this.text}中缺少 "${e1}"！`)
  }
}
