const COMBINING_MARKS = /[̀-ͯ]/g
const NON_ALPHANUMERIC = /[^a-z0-9]+/g

export function normalizeText(value: string): string {
    return value
        .normalize('NFD')
        .replace(COMBINING_MARKS, '')
        .toLowerCase()
        .replace(NON_ALPHANUMERIC, ' ')
        .trim()
}
