export function makeError(name: string) {
    return function (message: string) {
        const error = new Error(message)
        error.name = `[FormulaRunner: ${name}]`
        error.stack = error.stack!.replace(/\n.*?(?=\n)/, '')
        return error
    }
}
