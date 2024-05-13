import { makeError } from './utils'

const OPERATORS: Record<string, boolean> = {}

'+ - * / % === !== == != < > <= >= && || ! = |'.split(' ').forEach(function (operator) {
  OPERATORS[operator] = true
})

const ESCAPE: Record<string, string> = {
  'n': '\n',
  'f': '\f',
  'r': '\r',
  't': '\t',
  'v': '\v',
  '\'': '\'',
  '"': '"'
}
const lexerMinErr = makeError('Lexer')

export interface Token {
  text: string
  operator?: boolean
  identifier?: boolean
  value?: any
  constant?: boolean
}

export class Lexer {
  private index = 0
  private text!: string
  private tokens: Token[] = []

  lex(text: string) {
    this.tokens = []
    this.text = text
    this.index = 0
    while (this.index < this.text.length) {
      const currentText = this.text.charAt(this.index)

      if (currentText === '"' || currentText === '\'') {
        this.readString(currentText)
      } else if (this.isNumber(currentText) || currentText === '.' && this.isNumber(this.peek())) {
        // 解析数字一定要在解析标识符前面
        this.readNumber()
      } else if (this.isIdent(currentText)) {
        this.readIdent()
      } else if ('(){}[].,;:?'.indexOf(currentText) !== -1) {
        // 如果是语法结构符号
        this.tokens.push({
          text: currentText,
        })
        this.index++
      } else if (currentText === ' ' || currentText === '\r' || currentText === '\t' ||
        currentText === '\n' || currentText === '\v' || currentText === '\u00A0') {
        // 如果是空白字符，则跳过
        // \u00a0 是抄google的，原文：IE treats non-breaking space as \u00A0
        this.index++
      } else {
        // 其它情况，如：+ - * / % === !== == != < > <= >= && || ! = |

        // currentText为单个运算符
        const t1 = currentText + this.peek() // 两个符号的运算符
        const t2 = t1 + this.peek(2) // 三个符号的运算符

        // 检测在当前运算符列表中是否有以上情况的一种，并取最长的为准
        const option1 = OPERATORS[currentText]
        const option2 = OPERATORS[t1]
        const option3 = OPERATORS[t2]

        if (option1 || option2 || option3) {
          const token = option3 ? t2 : (option2 ? t1 : currentText)
          this.tokens.push({
            text: token,
            operator: true
          })
          this.index += token.length
        } else {
          // 如果以上条件都不符合，则断定为当前不是一个合法的表达式
          throw lexerMinErr(`${this.text}不是一个合法的表达式`)
        }
      }
    }
    return this.tokens
  }

  private isIdent(text: string) {
    // 校验text是否符合js标识符命名规范
    return text >= 'a' && text <= 'z' || text >= 'A' && text <= 'Z' || text === '$' || text === '_'
    // return /[_$a-z]/i.test(text); 上面一种写法性能更高
  }

  private readIdent() {
    const start = this.index
    while (this.index < this.text.length) {
      const currentText = this.text.charAt(this.index)
      if (!(this.isIdent(currentText) || this.isNumber(currentText))) {
        break
      }
      this.index++
    }
    this.tokens.push({
      text: this.text.slice(start, this.index),
      identifier: true
    })
  }

  private readNumber() {
    let value = ''
    let appearedDot = false
    while (this.index < this.text.length) {
      // 取当前的字符串，并且转小写，因为有可能是科学计数法，中间会有e;
      const currentText = this.text.charAt(this.index).toLowerCase()
      if (currentText === '.') {
        // 如果是以小数点开头，
        if (!this.isNumber(this.peek())) {
          throw lexerMinErr(`解析数字 "${value}" 出错，"." 后面不能为${this.peek()}！`)
        }
        if (appearedDot) {
          throw lexerMinErr(`解析数字 "${value}" 出错，后面不能为 "."！`)
        }
        value += currentText
        appearedDot = true
      } else if (this.isNumber(currentText)) {
        value += currentText
      } else {
        const nextText = this.peek()
        if (currentText === 'e' && nextText && this.isExpOperator(nextText)) {
          // 如果当前为e,并且后面一位是数字或+-号，则断定为科学计数法
          value += currentText
        } else if (this.isExpOperator(currentText) && nextText && this.isNumber(nextText) && value.charAt(value.length - 1) === 'e') {
          // 如果当前是+-号，并且有下一位，且下一位是数字，并且当前值的最后一位是e，则断定为正确的科学计数法
          // 这里只能是+-号，因为数字会走前面的分支
          value += currentText
        } else if (this.isExpOperator(currentText) && (!nextText || !this.isNumber(nextText)) && value.charAt(value.length - 1) === 'e') {
          // 如果当前是+-号，
          // 并且没有下一位，或者且下一位不是数字，并且当前值的最后一位是e，则断定数字解析出错
          // 这里只能是+-号，因为数字会走前面的分支
          throw lexerMinErr(`${value}${currentText}不是一个正确的数字！`)
        } else {
          break
        }
      }
      this.index++
    }
    this.tokens.push({
      text: value,
      value: Number(value),
      constant: true
    })
  }

  private isExpOperator(text: string) {
    // 主要用于校验科学计数法e后面的内容
    return text === '+' || text === '-' || this.isNumber(text)
  }

  private isNumber(currentText: any) {
    return typeof currentText === 'string' && currentText >= '0' && currentText <= '9'
  }

  private peek(index?: number) {
    const i = index || 1
    return this.index + i < this.text.length ? this.text.charAt(this.index + i) : false
  }

  private readString(quote: string) {
    let value = ''
    let escape = false // 是否有转义
    this.index++
    while (this.index < this.text.length) {
      const currentText = this.text.charAt(this.index)
      if (escape) {
        // 如果有转义
        if (currentText === 'u') {
          // 如果是unicode编码，向后取4位
          const hexCode = this.text.substring(this.index + 1, this.index + 5)
          if (/[\da-f]{4}/i.test(hexCode)) {
            // 如果符合nuicode编码
            value += String.fromCharCode(parseInt(hexCode, 16))
            this.index += 4 // 加4是因为后面的this.index++
          } else {
            throw lexerMinErr(`转义\\${hexCode}失败，或者\\${hexCode}不是一个合法的 nuicode 字符`)
          }
        } else {
          value += ESCAPE[currentText] || currentText
        }
        escape = false
      } else if (currentText === '\\') {
        // 如果遇到转义
        escape = true
      } else if (currentText === quote) {
        // 如果遇到和初始引号相同的引号，则字符串读取结束
        this.index++
        this.tokens.push({
          text: quote + value + quote,
          constant: true,
          value: value
        })
        return
      } else {
        value += currentText
      }
      this.index++
    }
    throw lexerMinErr(`字符串 "${value}" 未解析失败，缺少结束引号。`)
  }
}
