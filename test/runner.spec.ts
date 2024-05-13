import { FormulaRunner } from "@tanbo/formula-runner";

describe('普通运算', () => {
  const runner = new FormulaRunner()

  test('支持四则运算', () => {
    expect(runner.parse('1+2 * (3 + 3) / 2 -3').run({})).toBe(4)
  })
  test('支持字符串运算', () => {
    expect(runner.parse('"a" + "b"').run({})).toBe('ab')
  })
  test('支持一元逻辑运算', () => {
    expect(runner.parse('5').run({})).toBe(5)
    expect(runner.parse('"5"').run({})).toBe('5')
    expect(runner.parse('-5').run({})).toBe(-5)
    expect(runner.parse('+5').run({})).toBe(5)
    expect(runner.parse('+-5').run({})).toBe(-5)
    expect(runner.parse('--5').run({})).toBe(5)
    expect(runner.parse('!5').run({})).toBeFalsy()
    expect(runner.parse('!!5').run({})).toBeTruthy()
  })
  test('支持二元逻辑运算', () => {
    expect(runner.parse('true && 5').run({})).toBeTruthy()
    expect(runner.parse('false && 5').run({})).toBeFalsy()
    expect(runner.parse('true || 5').run({})).toBe(true)
    expect(runner.parse('false || 5').run({})).toBe(5)
    expect(runner.parse('3 > 4').run({})).toBeFalsy()
    expect(runner.parse('3 < 4').run({})).toBeTruthy()
    expect(runner.parse('3 >= 4').run({})).toBeFalsy()
    expect(runner.parse('3 <= 4').run({})).toBeTruthy()
    expect(runner.parse('3  % 4').run({})).toBe(3)
    expect(runner.parse('3 == 4').run({})).toBeFalsy()
    expect(runner.parse('3 != 4').run({})).toBeTruthy()
    expect(runner.parse('3 === 4').run({})).toBeFalsy()
    expect(runner.parse('3 !== 4').run({})).toBeTruthy()
  })
  test('支持三元运算', () => {
    expect(runner.parse('5 ? 6 : 7').run({})).toBe(6)
    expect(runner.parse('0 ? 6 : 7').run({})).toBe(7)
  })
  test('支持科学计数法', () => {
    expect(runner.parse('1e3').run({})).toBe(1000)
    expect(runner.parse('-1e3').run({})).toBe(-1000)
    expect(runner.parse('-1.0e3').run({})).toBe(-1000)
    expect(runner.parse('1.2e3').run({})).toBe(1200)
    expect(runner.parse('1.2e-3').run({})).toBe(0.0012)
    expect(runner.parse('2 * -1.0e3').run({})).toBe(-2000)
    expect(runner.parse('2 * -1.0e-3').run({})).toBe(-0.002)
  })
  test('支持字符串', () => {
    expect(runner.parse('"a"').run({})).toBe('a')
    expect(runner.parse('\'a\'').run({})).toBe('a')
    expect(runner.parse('"\\u0061"').run({})).toBe('a')
    expect(runner.parse('"a\\na"').run({})).toBe('a\na')
    expect(runner.parse('"\\a"').run({})).toBe('a')
  })

  test('支持赋值表达式', () => {
    const obj: any = {}
    runner.parse('a = 20').run(obj)
    expect(obj.a).toBe(20)
  })

  test('支持解析数组', () => {
    expect(runner.parse('[10, 20][1]').run({})).toBe(20)
  })
  test('支持解析对象', () => {
    expect(runner.parse('{a: 10, b: 20}["b"]').run({})).toBe(20)
  })
  test('支持尾逗号', () => {
    expect(expect(runner.parse('[10, 20,][1]').run({})).toBe(20))
    expect(runner.parse('{a: 10, b: 20,}["b"]').run({})).toBe(20)
  })
  test('支持常量 key', () => {
    // expect(expect(runner.parse('[10, 20,][1]').run({})).toBe(20))
    expect(runner.parse('{true: 10, false: 20,}[true]').run({})).toBe(10)
  })
  test('支持 this 表达式', () => {
    expect(runner.parse('this.a').run({a: 10})).toBe(10)
  })
  test('支持 NaN', () => {
    expect(runner.parse('toNumber() == toNumber()').run({toNumber() {return NaN}})).toBeTruthy()
    expect(runner.parse('toNumber() == 2').run({toNumber() {return NaN}})).toBeFalsy()
    expect(runner.parse('toNumber() === toNumber()').run({toNumber() {return NaN}})).toBeTruthy()
    expect(runner.parse('toNumber() === 2').run({toNumber() {return NaN}})).toBeFalsy()
  })
})

describe('取值及函数调用', () => {
  const runner = new FormulaRunner()

  test('支持函数调用', () => {
    expect(runner.parse('a()').run({
      a() {
        return 'aaa'
      }
    })).toBe('aaa')
  })

  test('支持多层取值', () => {
    expect(runner.parse('a.aa.aaa + a.ab + b.ba + c').run({
      a: {
        aa: {
          aaa: 1
        },
        ab: 2
      },
      b: {
        ba: 3
      },
      c: 4
    })).toBe(10)
  })
  test('支持链式调用', () => {
    expect(runner.parse('toNumber("10.123").toFixed(2).substring(3)').run({
      toNumber(a: any) {
        return +a
      }
    })).toBe('12')
  })
})

describe('过滤器', () => {
  const runner = new FormulaRunner({
    toNumber(a: any) {
      return +a
    },
    addPrefix(a: any, b = '') {
      return b + a
    }
  })

  test('普通过滤器', () => {
    expect(runner.parse('"10" | toNumber').run({})).toBe(10)
  })
  test('支持过滤器参数', () => {
    expect(runner.parse('"10" | addPrefix: "aa"').run({})).toBe('aa10')
    expect(runner.parse('"10" | addPrefix: 1 + 3').run({})).toBe('410')
  })
  test('支持多过滤器', () => {
    expect(runner.parse('"10" | addPrefix: 1 + 3 | toNumber').run({})).toBe(410)
  })
})

describe('异常处理', () => {
  const runner = new FormulaRunner()

  test('缺少右项', () => {
    expect(() => {
      runner.parse('5+').run({})
    }).toThrow()
  })

  test('未完成的字符器', () => {
    expect(() => {
      runner.parse('"a').run({})
    }).toThrow()
  })

  test('错误的转义字符器', () => {
    expect(() => {
      runner.parse('"\\uaf3k"').run({})
    }).toThrow()
  })
  test('未完成的数字', () => {
    expect(() => {
      runner.parse('1.').run({})
    }).toThrow()
  })
  test('错误的数字', () => {
    expect(() => runner.parse('1.1.1').run({})).toThrow()
    expect(() => runner.parse('1.2e-a').run({})).toThrow()
  })
  test('未完成的表达式', () => {
    expect(() => {
      runner.parse('"a" + ').run({})
    }).toThrow()
  })

  test('不存在的值', () => {
    expect(() => {
      runner.parse('a.a').run({})
    }).toThrow()
  })

  test('不存在的方法', () => {
    expect(() => {
      runner.parse('a()').run({})
    }).toThrow()
  })

  test('不存在的过滤器', () => {
    expect(() => {
      runner.parse('10 | add').run({})
    }).toThrow()
  })

  test('多余的语句', () => {
    expect(() => {
      runner.parse('10 + 20 30 + 40').run({})
    }).toThrow()
  })
  test('意外的赋值', () => {
    expect(() => {
      runner.parse('a[{}] = 3').run({a: {}})
    }).toThrow()
  })

  test('错误的过滤器名字', () => {
    expect(() => {
      runner.parse('10 | 5').run({a: {}})
    }).toThrow()
  })

  test('错误的过滤器类型', () => {
    expect(() => {
      const runner = new FormulaRunner({a: {} as any})
      runner.parse('10 | a').run({})
    }).toThrow()
  })
  test('错误的过滤器类型', () => {
    expect(() => {
      const runner = new FormulaRunner({a: {} as any})
      runner.parse('10 | a.b').run({})
    }).toThrow()
  })
  test('错误的表达式', () => {
    expect(() => runner.parse('! ').run({a: {}})).toThrow()
    expect(() => runner.parse('+ ').run({a: {}})).toThrow()
    expect(() => runner.parse('- ').run({a: {}})).toThrow()
    expect(() => runner.parse('1 + ').run({a: {}})).toThrow()
    expect(() => runner.parse('1 - ').run({a: {}})).toThrow()
    expect(() => runner.parse('1 * ').run({a: {}})).toThrow()
    expect(() => runner.parse('1 / ').run({a: {}})).toThrow()
    expect(() => runner.parse('1 % ').run({a: {}})).toThrow()
    expect(() => runner.parse('1 == ').run({a: {}})).toThrow()
    expect(() => runner.parse('1 != ').run({a: {}})).toThrow()
    expect(() => runner.parse('1 || ').run({a: {}})).toThrow()
    expect(() => runner.parse('1 && ').run({a: {}})).toThrow()
    expect(() => runner.parse('1 > ').run({a: {}})).toThrow()
    expect(() => runner.parse('1 < ').run({a: {}})).toThrow()
    expect(() => runner.parse('1 >= ').run({a: {}})).toThrow()
    expect(() => runner.parse('1 <= ').run({a: {}})).toThrow()
    expect(() => runner.parse('1 === ').run({a: {}})).toThrow()
    expect(() => runner.parse('1 !== ').run({a: {}})).toThrow()
    expect(() => runner.parse('1 ? : 3 ').run({a: {}})).toThrow()
    expect(() => runner.parse('1 ? 2 :  ').run({a: {}})).toThrow()
  })
  test('不支持的表达式', () => {
    expect(() => runner.parse('1 & 1').run({a: {}})).toThrow()
  })
  test('意外的格式', () => {
    expect(() => runner.parse('1 & 1').run({a: {}})).toThrow()
    expect(() => runner.parse('{*}').run({a: {}})).toThrow()
    expect(() => runner.parse('{').run({a: {}})).toThrow()
  })
})
